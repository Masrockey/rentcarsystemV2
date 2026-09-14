<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SanitizeHostHeader
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $host = $request->headers->get('host');
        if ($host && (str_contains($host, '<calculated') || str_contains($host, '<'))) {
            $request->headers->set('host', 'localhost:8000');
        }

        return $next($request);
    }
}
