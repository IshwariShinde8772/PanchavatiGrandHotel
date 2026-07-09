-- Panchavati Grand - Database Initialization Script
-- Database: hotel_db

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Staff Table
CREATE TABLE IF NOT EXISTS staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'receptionist', 'manager', 'housekeeping', 'kitchen', 'server') NOT NULL,
    schedule JSON DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    nationality VARCHAR(100),
    id_type VARCHAR(50),
    id_number VARCHAR(100),
    id_expiry DATE,
    id_doc_path VARCHAR(500),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category ENUM('Standard', 'Deluxe', 'Regular') NOT NULL,
    description TEXT NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    seasonal_price DECIMAL(10, 2),
    seasonal_start DATE,
    seasonal_end DATE,
    discount_pct DECIMAL(5, 2),
    discount_start DATE,
    discount_end DATE,
    total_units INT DEFAULT 1,
    capacity INT NOT NULL,
    amenities JSON DEFAULT NULL,
    images JSON DEFAULT NULL,
    floor INT,
    view_type VARCHAR(100),
    bed_type VARCHAR(50) DEFAULT 'King',
    size_sqm INT DEFAULT 28,
    is_active BOOLEAN DEFAULT TRUE,
    status ENUM('available', 'occupied', 'maintenance', 'cleaning') DEFAULT 'available',
    nashik_landmark VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_ref VARCHAR(50) NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    room_id INT NOT NULL,
    check_in DATE NOT NULL,
    check_in_time VARCHAR(5) NOT NULL DEFAULT '14:00',
    check_in_datetime DATETIME,
    auto_cancel_at DATETIME,
    no_show_grace_minutes INT NOT NULL DEFAULT 60,
    check_out DATE NOT NULL,
    guests INT DEFAULT 1,
    adults INT DEFAULT 1,
    children INT DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    paid_amount DECIMAL(10, 2) DEFAULT 0.00,
    payment_status ENUM('pending', 'partial', 'paid', 'refunded') DEFAULT 'pending',
    payment_method VARCHAR(50),
    status ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled') DEFAULT 'pending',
    cancellation_type VARCHAR(40),
    auto_cancellation_reason TEXT,
    auto_cancelled_at DATETIME,
    refund_request_created_at DATETIME,
    actual_checkin_time DATETIME,
    actual_checkout_time DATETIME,
    checked_in_by_staff_id INT,
    checked_out_by_staff_id INT,
    checked_out_by_role VARCHAR(30),
    is_early_checkout BOOLEAN NOT NULL DEFAULT FALSE,
    early_checkout_at DATETIME,
    early_checkout_reason TEXT,
    early_checkout_note TEXT,
    original_checkout_date DATE,
    early_checkout_refund_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    early_checkout_adjustment_charge DECIMAL(10, 2) NOT NULL DEFAULT 0,
    early_checkout_policy_applied VARCHAR(160),
    room_status_after_checkout VARCHAR(30),
    special_requests TEXT,
    id_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    INDEX bookings_auto_cancel_status_idx (auto_cancel_at, status)
) ENGINE=InnoDB;

-- 6. Bills Table
CREATE TABLE IF NOT EXISTS bills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bill_no VARCHAR(50) NOT NULL UNIQUE,
    booking_id INT NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    gst_amount DECIMAL(10, 2) NOT NULL,
    extra_charges JSON DEFAULT NULL,
    total_payable DECIMAL(10, 2) NOT NULL,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
) ENGINE=InnoDB;

-- 6A. Payment Transactions Table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    customer_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    payment_method ENUM('qr', 'online', 'upi', 'cash', 'card', 'pay_later') DEFAULT 'qr',
    status ENUM('pending', 'paid', 'expired', 'cancelled', 'failed') DEFAULT 'pending',
    upi_id VARCHAR(255),
    razorpay_qr_id VARCHAR(255),
    qr_payload TEXT,
    qr_image_url TEXT,
    qr_expires_at DATETIME,
    payment_reference VARCHAR(255),
    paid_at DATETIME,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB;

-- 7. Feedback Table
CREATE TABLE IF NOT EXISTS feedbacks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    room_category VARCHAR(100),
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    status ENUM('pending', 'published', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB;

-- 8. Enquiries Table
CREATE TABLE IF NOT EXISTS enquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    message TEXT NOT NULL,
    status ENUM('pending', 'responded', 'closed') DEFAULT 'pending',
    assigned_to INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES staff(id)
) ENGINE=InnoDB;

-- 9. Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    category ENUM('Linen', 'Toiletries', 'Food', 'Cleaning', 'Maintenance', 'Beverage') NOT NULL,
    quantity INT DEFAULT 0,
    reorder_level INT DEFAULT 10,
    unit VARCHAR(50) DEFAULT 'pieces',
    last_restocked DATE,
    supplier VARCHAR(255)
) ENGINE=InnoDB;

-- 10. Maintenance Logs
CREATE TABLE IF NOT EXISTS maintenance_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT,
    item_id INT,
    issue_title VARCHAR(255) NOT NULL,
    description TEXT,
    priority ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium',
    status ENUM('pending', 'in_progress', 'resolved') DEFAULT 'pending',
    reported_by INT NOT NULL,
    assigned_to INT,
    photo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (reported_by) REFERENCES staff(id),
    FOREIGN KEY (assigned_to) REFERENCES staff(id)
) ENGINE=InnoDB;

-- 11. Hotel Settings
CREATE TABLE IF NOT EXISTS hotel_settings (
    id INT PRIMARY KEY,
    hotel_name VARCHAR(255),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    whatsapp VARCHAR(20),
    gstin VARCHAR(50),
    gst_percent DECIMAL(5, 2) DEFAULT 12.00,
    check_in_time TIME DEFAULT '14:00:00',
    check_out_time TIME DEFAULT '11:00:00',
    extra_bed_charge DECIMAL(10, 2) DEFAULT 500.00,
    cancellation_policy TEXT,
    logs_enabled BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- 12. Saved Rooms (Wishlist)
CREATE TABLE IF NOT EXISTS saved_rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    room_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id, room_id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id)
) ENGINE=InnoDB;

-- 13. Customer History
CREATE TABLE IF NOT EXISTS customer_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    booking_id INT NOT NULL,
    summary TEXT,
    last_stay_date DATE,
    total_spent DECIMAL(10, 2),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
) ENGINE=InnoDB;

-- Insert Seed Data
INSERT INTO admins (full_name, email, password_hash) 
VALUES ('Super Admin', 'admin@panchavatgrand.in', '$2a$12$6y9lK5X5R0.kY7X3m9fG.uFkL8Ym2b3c4d5e6f7g8h9i0j1k2l3m'); -- password: password123

INSERT INTO hotel_settings (id, hotel_name, address, phone, email, whatsapp, gstin)
VALUES (1, 'Panchavati Grand', 'Panchavati, Godavari Ghat, Nashik, Maharashtra 422003', '+91 253 123 4567', 'stay@panchavatgrand.in', '+919876543210', '27AAAAA0000A1Z5');

SET FOREIGN_KEY_CHECKS = 1;
