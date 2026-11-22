CREATE TABLE `alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`health_unit_id` integer NOT NULL,
	`type` text NOT NULL,
	`priority` text NOT NULL,
	`status` text NOT NULL,
	`title` text NOT NULL,
	`details` text NOT NULL,
	`created_at` text NOT NULL,
	`resolved_at` text,
	`resolution_note` text,
	`appointment_id` integer,
	`symptom_report_id` integer,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`health_unit_id`) REFERENCES `health_units`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`symptom_report_id`) REFERENCES `symptom_reports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`kind` text NOT NULL,
	`scheduled_at` text NOT NULL,
	`professional` text NOT NULL,
	`status` text NOT NULL,
	`notes` text,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `care_checks` (
	`patient_id` integer NOT NULL,
	`item_id` text NOT NULL,
	`done_at` text NOT NULL,
	PRIMARY KEY(`patient_id`, `item_id`),
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `health_units` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`neighborhood` text NOT NULL,
	`city` text NOT NULL,
	`phone` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`birth_date` text NOT NULL,
	`phone` text NOT NULL,
	`last_menstrual_period` text NOT NULL,
	`first_pregnancy` integer NOT NULL,
	`high_risk` integer NOT NULL,
	`community_agent` text NOT NULL,
	`health_unit_id` integer NOT NULL,
	FOREIGN KEY (`health_unit_id`) REFERENCES `health_units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `symptom_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`reported_at` text NOT NULL,
	`symptoms` text NOT NULL,
	`systolic` integer,
	`diastolic` integer,
	`temperature_celsius` real,
	`notes` text,
	`risk_level` text NOT NULL,
	`reasons` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
