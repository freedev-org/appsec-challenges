<?php

class User
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function get(string $email): array|false
    {
        $sql = "
            SELECT
                id,
                email,
                name,
                username,
                picture_url
            FROM users
            WHERE email = '$email'
        ";

        $statement = $this->db->prepare($sql);
        $statement->execute();

        return $statement->fetch(PDO::FETCH_ASSOC);
    }
}
