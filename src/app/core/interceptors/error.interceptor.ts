import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { I18nService } from '../services/i18n.service';
import { NotificationService } from '../services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith('/assets/') || req.url.includes('/assets/')) {
    return next(req);
  }

  const notifications = inject(NotificationService);
  const i18n = inject(I18nService);
  const silent = req.headers.get('X-Silent') === 'true';
  const sanitisedReq = silent
    ? req.clone({ headers: req.headers.delete('X-Silent') })
    : req;

  return next(sanitisedReq).pipe(
    catchError((err: unknown) => {
      if (!silent && err instanceof HttpErrorResponse) {
        notifications.error(messageFor(err, req.url, i18n));
      }
      return throwError(() => err);
    }),
  );
};

function messageFor(
  err: HttpErrorResponse,
  url: string,
  i18n: I18nService,
): string {
  const key =
    url.includes('/api/strava') || url.includes('strava.com')
      ? 'errors.strava'
      : url.includes('/api/routes')
        ? 'errors.routes'
        : url.includes('/api/instagram')
          ? 'errors.instagram'
          : url.includes('docs.google.com')
            ? 'errors.sheet'
            : 'errors.generic';

  const translated = i18n.t(key);
  if (!translated.startsWith('errors.')) return translated;

  if (err.status === 0) return 'No network connection.';
  if (err.status >= 500) return 'The server is having trouble. Try again soon.';
  if (err.status === 404) return 'The requested resource was not found.';
  return `Request failed (${err.status}).`;
}
