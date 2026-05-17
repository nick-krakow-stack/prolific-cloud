<?php
declare(strict_types=1);
require_once __DIR__ . '/session.php';
do_logout();
header('Location: /');
exit;
