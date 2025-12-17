
SET NAMES utf8mb4;
SET CHARACTER_SET_CLIENT=utf8mb4;
SET CHARACTER_SET_CONNECTION=utf8mb4;

INSERT INTO Category (name, slug) VALUES ('เตียงผู้ป่วย', 'hospital-bed');
SET @bed := LAST_INSERT_ID();

INSERT INTO Category (name, slug, parentId) VALUES
('เตียงผู้ป่วยมือหมุน', 'manual-bed', @bed),
('เตียงผู้ป่วยไฟฟ้า', 'electric-bed', @bed),
('เตียงเคลื่อนย้ายผู้ป่วย', 'stretcher-bed', @bed);


INSERT INTO Category (name, slug) VALUES ('รถเข็นผู้ป่วย', 'wheelchair');
SET @wheel := LAST_INSERT_ID();

INSERT INTO Category (name, slug, parentId) VALUES
('รถเข็นมาตรฐาน', 'standard-wheelchair', @wheel),
('รถเข็นผู้ป่วยปรับนอน', 'reclining-wheelchair', @wheel),
('รถเข็นนั่งถ่าย', 'commode-wheelchair', @wheel),
('รถเข็นอัลลอยด์น้ำหนักเบา', 'alloy-wheelchair', @wheel),
('รถเข็นเบาะกว้าง', 'wide-wheelchair', @wheel);



INSERT INTO Category (name, slug) VALUES ('อุปกรณ์ผู้สูงอายุ', 'elderly-aid');
SET @elder := LAST_INSERT_ID();


INSERT INTO Category (name, slug, parentId) VALUES
('ห้องน้ำผู้สูงอายุ', 'commode-chair', @elder),
('อุปกรณ์ช่วยเดิน', 'urinal', @elder),
('เฝือกดามคอ', 'bedpan', @elder);


INSERT INTO Category (name, slug, parentId) VALUES
('ป้ายข้อมือผู้ป่วย', 'walker', @elder),
('อุปกรณ์เสริม', 'crutch', @elder),




INSERT INTO Category (name, slug) VALUES ('ครุภัณฑ์ทางการแพทย์', 'medical-furniture');
SET @furn := LAST_INSERT_ID();

INSERT INTO Category (name, slug, parentId) VALUES
('โต๊ะคร่อมเตียง', 'overbed-table', @furn),
('รถเข็นจ่ายยา', 'med-cart', @furn),
('รถเข็นฉุกเฉิน ABS', 'abs-emergency-cart', @furn),
('รถเข็นทางการแพทย์', 'infusion-trolley', @furn),
('ตู้ข้างเตียง', 'bedside-cabinet', @furn);



INSERT INTO Category (name, slug) VALUES ('อุปกรณ์ฉีดยา', 'injection');
SET @inject := LAST_INSERT_ID();

INSERT INTO Category (name, slug, parentId) VALUES
('Injection Plug', 'injection-plug', @inject),
('Extension Tube', 'extension-tube', @inject),
('กล่องทิ้งเข็ม', 'sharps-box', @inject);
