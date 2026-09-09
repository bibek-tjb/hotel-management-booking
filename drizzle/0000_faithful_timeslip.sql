CREATE TABLE `hotel_bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`user_id` text NOT NULL,
	`request_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`room_type` text NOT NULL,
	`room_number` integer NOT NULL,
	`check_in` text NOT NULL,
	`check_out` text NOT NULL,
	`guests` integer NOT NULL,
	`guest_name` text NOT NULL,
	`guest_email` text NOT NULL,
	`guest_phone` text NOT NULL,
	`requests` text DEFAULT '' NOT NULL,
	`breakfast` integer DEFAULT 0 NOT NULL,
	`nightly_price` integer NOT NULL,
	`nights` integer NOT NULL,
	`total` integer NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hotel_bookings_reference_unique` ON `hotel_bookings` (`reference`);--> statement-breakpoint
CREATE UNIQUE INDEX `hotel_bookings_request_key` ON `hotel_bookings` (`user_id`,`request_key`);--> statement-breakpoint
CREATE INDEX `hotel_bookings_user_created` ON `hotel_bookings` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `hotel_bookings_room_dates` ON `hotel_bookings` (`room_type`,`room_number`,`status`,`check_in`,`check_out`);--> statement-breakpoint
CREATE INDEX `hotel_bookings_status_arrival` ON `hotel_bookings` (`status`,`check_in`);