-- phpMyAdmin SQL Dump
-- version 4.5.1
-- http://www.phpmyadmin.net
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 06-03-2017 a las 16:05:03
-- Versión del servidor: 10.1.16-MariaDB
-- Versión de PHP: 7.0.9

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `db672472483`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `accountmanager`
--

CREATE TABLE `accountmanager` (
  `id` int(11) NOT NULL,
  `nombre` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Volcado de datos para la tabla `accountmanager`
--

INSERT INTO `accountmanager` (`id`, `nombre`) VALUES
(1, 'Julia Carraro'),
(2, 'Kamila Krajnik'),
(3, 'Camilla Rolando'),
(4, 'Amparo Romero');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `advertisers`
--

CREATE TABLE `advertisers` (
  `id` int(2) NOT NULL,
  `nombre` varchar(30) NOT NULL,
  `id_am` varchar(30) NOT NULL DEFAULT '3'
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Volcado de datos para la tabla `advertisers`
--

INSERT INTO `advertisers` (`id`, `nombre`, `id_am`) VALUES
(1, 'Neomobile', 'Julia Carraro'),
(2, 'Admitad', 'Kamila Krajnik'),
(3, 'Applift', 'Camilla Rolando'),
(4, 'Digital Galaxy', 'Julia Carraro'),
(5, 'Naranya CPA', 'Julia Carraro'),
(6, 'Wadogo', 'Amparo Romero'),
(7, 'Mobquid LTD', 'Camilla Rolando'),
(8, 'Click2commission CPI', 'Camilla Rolando'),
(9, 'Instal', 'Amparo Romero'),
(10, 'Avazu CPA', 'Julia Carraro'),
(11, 'Digital Virgo', 'Julia Carraro'),
(12, 'Go Wide', 'Camilla Rolando'),
(13, 'Ximobi', 'Julia Carraro'),
(14, '3DM', 'Julia Carraro'),
(15, 'Surikate', 'Julia Carraro'),
(16, 'MobVista CPI', 'Amparo Romero'),
(17, 'Adstract', 'Kamila Krajnik'),
(18, 'Mobipuff', 'Julia Carraro'),
(19, 'Appcoach', 'Amparo Romero'),
(20, 'Image Perfect', 'Julia Carraro'),
(21, 'InlabDigital', 'Camilla Rolando'),
(22, 'Appalgo', 'Kamila Krajnik'),
(23, 'Moblin', 'Camilla Rolando'),
(24, 'AddValue Media CPI', 'Kamila Krajnik'),
(25, 'Layroute', 'Amparo Romero'),
(26, 'AdsFast', 'Camilla Rolando'),
(27, 'Headway CPA', 'Julia Carraro'),
(28, 'MiniMob', 'Amparo Romero'),
(29, 'Naranya CPI', 'Camilla Rolando'),
(30, 'SekoMedia', 'Amparo Romero'),
(31, 'Rekket CPA', 'Julia Carraro'),
(32, 'MappStreet', 'Kamila Krajnik'),
(33, 'Sabia Media', 'Kamila Krajnik'),
(34, 'Stroer', 'Camilla Rolando'),
(35, 'Blackfox', 'Amparo Romero'),
(36, 'SmartLead', 'Amparo Romero'),
(37, 'ClicksMob', 'Kamila Krajnik'),
(38, 'InlabDigital CPA', 'Camilla Rolando'),
(39, 'Eptonic', 'Amparo Romero'),
(40, 'Avazu', 'Amparo Romero'),
(41, 'Digital Turbine', 'Amparo Romero'),
(42, 'Marvel Media', 'Julia Carraro'),
(43, 'Collectcent', 'Julia Carraro'),
(44, 'OnMobile CPA', 'Julia Carraro'),
(45, 'Billy Mobile CPA', 'Julia Carraro'),
(46, 'Mobisummer', 'Camilla Rolando'),
(47, 'Traffikey', 'Camilla Rolando'),
(48, 'KIMIA CPA', 'Julia Carraro'),
(49, 'Adooya Crossrider CPI', 'Camilla Rolando'),
(50, 'Art of Click', 'Amparo Romero'),
(51, 'Matomy Media Group', 'Camilla Rolando'),
(52, 'BravAds', 'Camilla Rolando'),
(53, 'Affle', 'Camilla Rolando'),
(54, 'Rekket', 'Kamila Krajnik'),
(55, 'Mobligo', 'Amparo Romero'),
(56, 'Spyke Media', 'Kamila Krajnik'),
(57, 'Adxperience', 'Kamila Krajnik'),
(58, 'Stingrad', 'Kamila Krajnik'),
(59, 'Grand Oro LP', 'Amparo Romero'),
(60, 'Click2Commission CPA', 'Julia Carraro'),
(61, 'WinClap', 'Amparo Romero'),
(62, 'Televida', 'Julia Carraro'),
(63, 'Crazy4Media CPA', 'Julia Carraro'),
(64, 'Linkadia', 'Kamila Krajnik'),
(65, 'Cliq Digital', 'Julia Carraro'),
(66, 'Headway Digital CPA', 'Julia Carraro'),
(67, 'Mobco Cake', 'Camilla Rolando'),
(68, 'Offerseven', 'Kamila Krajnik'),
(69, 'VIP Response CPA', 'Julia Carraro'),
(70, 'Telecoming', 'Julia Carraro'),
(71, 'Spiroox CPA', 'Julia Carraro'),
(72, 'UC Union', 'Amparo Romero'),
(73, 'Epom Market', 'Amparo Romero'),
(74, 'Rocket10', 'Kamila Krajnik'),
(75, 'Mobrider', 'Amparo Romero'),
(76, 'Aragon Advertising', 'Julia Carraro'),
(77, 'Adxmi', 'Amparo Romero'),
(78, 'Freenet Company', 'Julia Carraro'),
(79, 'Mobidea', 'Julia Carraro'),
(80, 'Gameloft', 'Julia Carraro'),
(81, 'Imagine ADS', 'Julia Carraro'),
(82, 'PSMOVILES', 'Julia Carraro'),
(83, 'Buongiorno (Taplinks)', 'Julia Carraro'),
(84, 'Msales', 'Julia Carraro'),
(85, 'Kimia', 'Julia Carraro'),
(128, 'Ad3traffic', 'Camilla Rolando'),
(129, 'Adacts', 'Julia Carraro'),
(130, 'Addictive Ads', 'Julia Carraro'),
(131, 'Adooya Crossrider CPA', 'Julia Carraro'),
(132, 'Adstacks', 'Julia Carraro'),
(133, 'Adwool', 'Julia Carraro'),
(134, 'Affimobiz', 'Julia Carraro'),
(135, 'Affle CPA', 'Julia Carraro'),
(136, 'AlliTapp', 'Julia Carraro'),
(137, 'App Promoters', 'Julia Carraro'),
(138, 'Appave', 'Julia Carraro'),
(139, 'Basebone', 'Julia Carraro'),
(140, 'CliqDigital', 'Julia Carraro'),
(141, 'CPITraffic', 'Julia Carraro'),
(142, 'Crowmobi', 'Julia Carraro'),
(143, 'DCyphermedia', 'Julia Carraro'),
(144, 'DobleVia Latam', 'Julia Carraro'),
(145, 'Doozymob', 'Julia Carraro'),
(146, 'Glize', 'Julia Carraro'),
(147, 'Gold360', 'Julia Carraro'),
(148, 'Go-Rilla', 'Julia Carraro'),
(149, 'IDB Group', 'Julia Carraro'),
(150, 'JungleTap', 'Julia Carraro'),
(151, 'Kwanko (Swelen)', 'Julia Carraro'),
(152, 'Laddez', 'Julia Carraro'),
(153, 'Leadzinmarketing AFFTRACK', 'Julia Carraro'),
(154, 'Linkadia CPA', 'Julia Carraro'),
(155, 'Maverick CPA', 'Julia Carraro'),
(156, 'Miri Media', 'Julia Carraro'),
(157, 'MiskyAds', 'Julia Carraro'),
(158, 'MobChain', 'Julia Carraro'),
(159, 'Mobilogia', 'Julia Carraro'),
(160, 'Mobipium', 'Julia Carraro'),
(161, 'Mobobeat CPI', 'Julia Carraro'),
(162, 'Mobquid', 'Julia Carraro'),
(163, 'Mobquid CPA', 'Julia Carraro'),
(164, 'MoBrain (Headway)', 'Julia Carraro'),
(165, 'Mobsai', 'Julia Carraro'),
(166, 'Nanalab', 'Julia Carraro'),
(167, 'Persona.ly', 'Julia Carraro'),
(168, 'ReGaming', 'Julia Carraro'),
(169, 'Revenuemob', 'Julia Carraro'),
(170, 'Seko Media', 'Julia Carraro'),
(171, 'Softerik', 'Julia Carraro'),
(172, 'StartApp', 'Julia Carraro'),
(173, 'Superads', 'Julia Carraro'),
(174, 'Tracsion', 'Julia Carraro'),
(175, 'Trooperads', 'Julia Carraro'),
(176, 'Zenna', 'Julia Carraro');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `incomes`
--

CREATE TABLE `incomes` (
  `id` int(4) UNSIGNED ZEROFILL NOT NULL,
  `advertiser` varchar(50) DEFAULT '0',
  `am` varchar(50) DEFAULT '0',
  `clicks` int(12) DEFAULT '0',
  `conversion` int(12) DEFAULT '0',
  `revenue` decimal(10,2) DEFAULT '0.00',
  `platform_revenue` decimal(10,2) DEFAULT '0.00',
  `difference` decimal(10,2) DEFAULT '0.00',
  `scrubs` decimal(10,2) DEFAULT '0.00',
  `hold` decimal(10,2) DEFAULT '0.00',
  `validated` decimal(10,2) DEFAULT '0.00',
  `status` varchar(50) DEFAULT '0',
  `notas_am` varchar(200) DEFAULT 'Notes...',
  `notas_finance` varchar(200) DEFAULT 'Notes...',
  `date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `status`
--

CREATE TABLE `status` (
  `id` int(5) NOT NULL,
  `name` varchar(50) DEFAULT NULL,
  `code` varchar(25) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Volcado de datos para la tabla `status`
--

INSERT INTO `status` (`id`, `name`, `code`) VALUES
(1, 'facturas emitidas', 'verde'),
(2, 'pendiente validación', 'amarillo'),
(3, 'faltan datos fiscales', 'naranja'),
(4, 'facturado desde brasil', 'rojo'),
(5, 'emitido sin validar', 'morado');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(25) NOT NULL,
  `email` tinytext NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(30) NOT NULL,
  `created` datetime NOT NULL,
  `attempt` varchar(15) NOT NULL DEFAULT '0'
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_devices`
--

CREATE TABLE `user_devices` (
  `id` int(11) NOT NULL,
  `uid` int(11) NOT NULL COMMENT 'The user''s ID',
  `token` varchar(15) NOT NULL COMMENT 'A unique token for the user''s device',
  `last_access` varchar(20) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_tokens`
--

CREATE TABLE `user_tokens` (
  `token` varchar(40) NOT NULL COMMENT 'The generated unique token',
  `uid` int(11) NOT NULL COMMENT 'The User ID',
  `requested` varchar(20) NOT NULL COMMENT 'The date when token was created'
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `accountmanager`
--
ALTER TABLE `accountmanager`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `advertisers`
--
ALTER TABLE `advertisers`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `incomes`
--
ALTER TABLE `incomes`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `status`
--
ALTER TABLE `status`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `user_devices`
--
ALTER TABLE `user_devices`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `accountmanager`
--
ALTER TABLE `accountmanager`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;
--
-- AUTO_INCREMENT de la tabla `advertisers`
--
ALTER TABLE `advertisers`
  MODIFY `id` int(2) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=177;
--
-- AUTO_INCREMENT de la tabla `incomes`
--
ALTER TABLE `incomes`
  MODIFY `id` int(4) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT de la tabla `status`
--
ALTER TABLE `status`
  MODIFY `id` int(5) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;
--
-- AUTO_INCREMENT de la tabla `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT de la tabla `user_devices`
--
ALTER TABLE `user_devices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
