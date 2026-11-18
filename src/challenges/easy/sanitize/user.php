<?php
use function Utils\Security\sanitize_xss;
use function Utils\Security\sanitize_url;
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <title><?= sanitize_xss($user['name']) ?> | Profile</title>
</head>

<body>
    <h1><?= sanitize_xss($user['name']) ?></h1>
    <p>E-mail: <?= sanitize_xss($user['email']) ?></p>
    <p>Phone: <?= sanitize_xss($user['phone']) ?></p>
    <p>
        <a href="<?= sanitize_url($user['website_url']) ?>">
            Open user website
        </a>
    </p>
</body>

</html>
