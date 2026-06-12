CREATE TABLE `adminFeeLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`adminFeeAmount` decimal(12,2) NOT NULL,
	`adminFeePercentage` decimal(5,2) NOT NULL,
	`status` enum('pending','collected','transferred') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `adminFeeLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `productAmount` decimal(12,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `adminFeePercentage` decimal(5,2) DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `adminFeeAmount` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `shippingCost` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `googleId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `avatar` varchar(512);--> statement-breakpoint
ALTER TABLE `users` ADD `isEmailVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_googleId_unique` UNIQUE(`googleId`);--> statement-breakpoint
CREATE INDEX `adminFeeLog_orderId_idx` ON `adminFeeLogs` (`orderId`);--> statement-breakpoint
CREATE INDEX `adminFeeLog_status_idx` ON `adminFeeLogs` (`status`);--> statement-breakpoint
CREATE INDEX `googleId_idx` ON `users` (`googleId`);