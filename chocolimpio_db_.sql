CREATE DATABASE IF NOT EXISTS chocolimpio_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE chocolimpio_db;

DROP TABLE IF EXISTS usuarios;
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(15) UNIQUE NOT NULL,
    barrio VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    fecha_nac DATE NOT NULL,
    edad INT NOT NULL,
    pregunta_seguridad ENUM('nombre_mascota', 'lugar_nacimiento', 'nombre_maestro', 'comida_favorita') NOT NULL,
    respuesta_seguridad VARCHAR(255) NOT NULL,
    contraseña VARCHAR(255) NOT NULL,
    minutos INT DEFAULT 0,
    kg_reciclados DECIMAL(10,2) DEFAULT 0,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO usuarios (nombre, telefono, barrio, email, fecha_nac, edad, pregunta_seguridad, respuesta_seguridad, contraseña, minutos, kg_reciclados)
VALUES ('Juan Pérez', '3124567890', 'La Yesquita', 'juan@gmail.com', '1995-03-15', 30, 'nombre_mascota', 'firulais', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 0, 0);