<?php

namespace Utils\Security;


function sanitize_xss(string $text): string {
    return str_replace(['<', '>'], ['&lt;', '&gt;'], $text);
}

function sanitize_url(string $url): string|false {
    $url = trim(sanitize_xss($url));

    if (str_starts_with(strtolower($url), 'javascript:')) {
        return false;
    }

    return $url;
}
