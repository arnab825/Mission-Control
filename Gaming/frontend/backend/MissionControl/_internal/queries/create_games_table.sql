CREATE TABLE IF NOT EXISTS games (
    id           VARCHAR(255)  NOT NULL,
    user_id      VARCHAR(255)  NOT NULL,
    name         VARCHAR(255),
    platform     VARCHAR(255),
    install_path TEXT,
    exe_path     TEXT,
    icon         TEXT,
    features     TEXT,
    type         VARCHAR(255),
    genre        VARCHAR(255),
    tags         TEXT,
    source       VARCHAR(255),
    local_banner TEXT,
    PRIMARY KEY (id, user_id)
);
