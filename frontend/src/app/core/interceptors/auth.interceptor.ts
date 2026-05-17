import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  const token = auth.getToken();

  // Attach Bearer token to every outgoing request (skip auth endpoints)
  const cloned = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(cloned).pipe(
    catchError((err: HttpErrorResponse) => {
      // 401 means the JWT is invalid/expired on the server side — log the user out
      if (err.status === 401 && !req.url.includes('/api/auth/')) {
        auth.logout();
        router.navigate(['/auth/login'], {
          queryParams: { reason: 'session_expired' },
        });
      }
      return throwError(() => err);
    }),
  );
};