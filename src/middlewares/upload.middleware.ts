import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Images
  if (file.fieldname === "images") {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed for images field"));
    }
  }
  // Videos
  else if (file.fieldname === "videos") {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed for videos field"));
    }
  }
  // Documents
  else if (
    ["deedDocument", "inspectionReport", "appraisalReport"].includes(
      file.fieldname
    )
  ) {
    const allowedMimes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and image files are allowed for documents"));
    }
  } else {
    cb(null, true);
  }
};

export const propertyUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
}).fields([
  { name: "images", maxCount: 20 },
  { name: "videos", maxCount: 5 },
  { name: "deedDocument", maxCount: 1 },
  { name: "inspectionReport", maxCount: 1 },
  { name: "appraisalReport", maxCount: 1 },
]);
