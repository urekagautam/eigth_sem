/* eslint-disable react-hooks/purity */
import { useState } from "react";
import { Calendar, X, Edit2, Trash2 } from "lucide-react";
import Button from "../../components/Button";
import ImageUploadField from "../../components/ImageUploadField";
import { NOTICE_IMAGE_UPLOAD_PATH } from "../../constants/uploads";
import { uploadNoticeImage } from "../../utils/noticeImageUpload";

// Dummy data - simulating MongoDB documents
const dummyNotices = [
  {
    _id: "1",
    type: "text",
    title: "Mid-Semester Exams Schedule",
    description:
      "The mid-semester exams will be conducted from June 15th to June 22nd, 2024. All students are requested to check their exam schedule on the student portal. Please report 15 minutes before the scheduled time.",
    createdAt: "2024-05-16",
  },
  {
    _id: "2",
    type: "image",
    caption: "Annual Sports Day - June 2024",
    imagePath: NOTICE_IMAGE_UPLOAD_PATH,
    createdAt: "2024-05-10",
  },
  {
    _id: "3",
    type: "text",
    title: "Library Timings Updated",
    description:
      "Please note that the library will remain open until 8 PM on weekdays and 5 PM on weekends during the examination period. All borrowed books must be returned within the due date to avoid penalties.",
    createdAt: "2024-05-08",
  },
  {
    _id: "4",
    type: "image",
    caption: "New Computer Lab Inaugurated",
    imagePath: NOTICE_IMAGE_UPLOAD_PATH,
    createdAt: "2024-05-01",
  },
];

export default function Notices() {
  const [showAddNotice, setShowAddNotice] = useState(false);
  const [noticeType, setNoticeType] = useState("text"); // "text" or "image"
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    caption: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUploadError, setImageUploadError] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [notices, setNotices] = useState(dummyNotices);
  const [displayCount, setDisplayCount] = useState(3); // Start with 3 notices
  const [selectedDateRange, setSelectedDateRange] = useState({
    from: "",
    to: "",
  });
  const [textFormatting, setTextFormatting] = useState({
    isBold: false,
    isItalic: false,
    isUnderline: false,
  });
  const [expandedNotices, setExpandedNotices] = useState({}); // Track expanded descriptions
  const [deleteConfirmId, setDeleteConfirmId] = useState(null); // Track which notice is being deleted
  const [setEditingId] = useState(null); // Track which notice is being edited

  const clearImageSelection = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setImageUploadError(null);
  };

  const handleImageFileSelect = (file, errorMessage) => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      setImageUploadError(errorMessage);
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageUploadError(null);
  };

  const handleAddNotice = async () => {
    if (noticeType === "text" && (formData.title || formData.description)) {
      const newNotice = {
        _id: Date.now().toString(),
        type: "text",
        title: formData.title,
        description: formData.description,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setNotices([newNotice, ...notices]);
      resetForm();
      return;
    }

    if (noticeType === "image" && imageFile) {
      setIsPublishing(true);
      try {
        const { imagePath } = await uploadNoticeImage(imageFile);
        const newNotice = {
          _id: Date.now().toString(),
          type: "image",
          caption: formData.caption,
          imagePath,
          originalFileName: imageFile.name,
          createdAt: new Date().toISOString().split("T")[0],
        };
        setNotices([newNotice, ...notices]);
        resetForm();
      } catch {
        setImageUploadError("Could not upload image. Please try again.");
      } finally {
        setIsPublishing(false);
      }
    } else if (noticeType === "image") {
      setImageUploadError("Please upload an image for this notice.");
    }
  };

  const resetForm = () => {
    clearImageSelection();
    setFormData({ title: "", description: "", caption: "" });
    setShowAddNotice(false);
    setTextFormatting({ isBold: false, isItalic: false, isUnderline: false });
  };

  const handleDeleteNotice = (id) => {
    setNotices(notices.filter((notice) => notice._id !== id));
    setDeleteConfirmId(null);
  };

  const toggleExpandDescription = (id) => {
    setExpandedNotices((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const truncateText = (text, lines = 2) => {
    const lineArray = text.split("\n");
    if (lineArray.length > lines) {
      return lineArray.slice(0, lines).join("\n") + "...";
    }
    // For single paragraph, check approximate character count (roughly 80 chars per line)
    const charLimit = lines * 80;
    if (text.length > charLimit) {
      return text.substring(0, charLimit) + "...";
    }
    return text;
  };

  const canPublishImageNotice =
    noticeType === "image" && imageFile && !isPublishing;
  const canPublishTextNotice =
    noticeType === "text" && (formData.title || formData.description);

  const filteredNotices = notices.filter((notice) => {
    if (!selectedDateRange.from && !selectedDateRange.to) return true;
    const noticeDate = new Date(notice.createdAt);
    const fromDate = selectedDateRange.from
      ? new Date(selectedDateRange.from)
      : null;
    const toDate = selectedDateRange.to ? new Date(selectedDateRange.to) : null;

    if (fromDate && noticeDate < fromDate) return false;
    if (toDate && noticeDate > toDate) return false;
    return true;
  });

  const displayedNotices = filteredNotices.slice(0, displayCount);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notices</h1>
          <p className="text-gray-600 mt-1">
            Manage and view all academic notices
          </p>
        </div>
      </div>

      {/* Add Notice Modal */}
      {showAddNotice && (
        <div className="fixed inset-0 bg-black bg-black/30 flex items-center justify-center z-50 p-4 min-h-screen">
          <div
            className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide"
            style={{ scrollbarWidth: "none" }}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Add New Notice
              </h2>
              <button
                onClick={() => resetForm()}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Notice Type Selection */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="text"
                    checked={noticeType === "text"}
                    onChange={(e) => {
                      setNoticeType(e.target.value);
                      if (e.target.value === "text") clearImageSelection();
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700 font-medium">
                    Text Notice (Title & Description)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="image"
                    checked={noticeType === "image"}
                    onChange={(e) => setNoticeType(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700 font-medium">
                    Image Notice (With Caption)
                  </span>
                </label>
              </div>

              {/* Text Notice Form */}
              {noticeType === "text" && (
                <div className="space-y-6">
                  {/* Text Formatting Toolbar */}
                  <div className="flex gap-2 border-b border-gray-200 pb-4">
                    <button
                      onClick={() =>
                        setTextFormatting({
                          ...textFormatting,
                          isBold: !textFormatting.isBold,
                        })
                      }
                      className={`px-4 py-2 rounded font-bold transition-colors ${
                        textFormatting.isBold
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      B
                    </button>
                    <button
                      onClick={() =>
                        setTextFormatting({
                          ...textFormatting,
                          isItalic: !textFormatting.isItalic,
                        })
                      }
                      className={`px-4 py-2 rounded italic transition-colors ${
                        textFormatting.isItalic
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      I
                    </button>
                    <button
                      onClick={() =>
                        setTextFormatting({
                          ...textFormatting,
                          isUnderline: !textFormatting.isUnderline,
                        })
                      }
                      className={`px-4 py-2 rounded underline transition-colors ${
                        textFormatting.isUnderline
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      U
                    </button>
                  </div>

                  {/* Title Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Notice Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="Enter notice title..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {/* Description Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Enter notice description... (Text will be justified)"
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                      style={{ textAlign: "justify" }}
                    />
                  </div>
                </div>
              )}

              {/* Image Notice Form */}
              {noticeType === "image" && (
                <div className="space-y-6">
                  <ImageUploadField
                    file={imageFile}
                    previewUrl={imagePreview}
                    onFileSelect={handleImageFileSelect}
                    onClear={clearImageSelection}
                    error={imageUploadError}
                  />

                  {/* Caption Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Caption (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.caption}
                      onChange={(e) =>
                        setFormData({ ...formData, caption: e.target.value })
                      }
                      placeholder="Enter caption for the image..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-4 justify-end border-t border-gray-200 p-6">
              <Button onClick={() => resetForm()} variant="secondary">
                Cancel
              </Button>
              <Button
                onClick={handleAddNotice}
                variant="primary"
                disabled={!canPublishTextNotice && !canPublishImageNotice}
              >
                {isPublishing ? "Publishing..." : "Publish Notice"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Notice History Section */}
      <div className="space-y-6">
        <div className="sticky top-0 bg-white z-10 py-4 flex justify-between items-center gap-4 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">Notice History</h2>
          <div className="flex gap-3 items-center">
            <Button
              onClick={() => setShowAddNotice(!showAddNotice)}
              variant="primary"
              size="sm"
            >
              + Add Notice
            </Button>
            {displayCount < filteredNotices.length ? (
              <Button
                onClick={() => setDisplayCount(displayCount + 3)}
                variant="outline"
                size="sm"
              >
                View All
              </Button>
            ) : (
              displayCount > 3 && (
                <Button
                  onClick={() => setDisplayCount(3)}
                  size="sm"
                  className="bg-gray-500/50 text-white hover:bg-gray-600/60 border-0"
                >
                  View Less
                </Button>
              )
            )}
          </div>
        </div>

        {/* Date Filter */}
        <div className="flex gap-4 flex-wrap items-center">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-600" />
            <input
              type="date"
              value={selectedDateRange.from}
              onChange={(e) =>
                setSelectedDateRange({
                  ...selectedDateRange,
                  from: e.target.value,
                })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <span className="text-gray-500 text-sm">—</span>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDateRange.to}
              onChange={(e) =>
                setSelectedDateRange({
                  ...selectedDateRange,
                  to: e.target.value,
                })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          {(selectedDateRange.from || selectedDateRange.to) && (
            <Button
              onClick={() => setSelectedDateRange({ from: "", to: "" })}
              variant="secondary"
              size="sm"
            >
              Clear Filter
            </Button>
          )}
        </div>

        {/* Notices List */}
        <div className="space-y-6">
          {displayedNotices.length > 0 ? (
            displayedNotices.map((notice) => (
              <div
                key={notice._id}
                className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Notice Header with Date and Action Buttons */}
                <div className="flex justify-between items-start gap-4 mb-4 flex-wrap">
                  <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                    {new Date(notice.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(notice._id)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit notice"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(notice._id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete notice"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Notice Content */}
                {notice.type === "text" ? (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {notice.title}
                    </h3>
                    <div>
                      <p
                        className="text-gray-700 whitespace-pre-wrap"
                        style={{ textAlign: "justify" }}
                      >
                        {expandedNotices[notice._id]
                          ? notice.description
                          : truncateText(notice.description, 2)}
                      </p>
                      {notice.description.split("\n").length > 2 ||
                      notice.description.length > 160 ? (
                        <button
                          onClick={() => toggleExpandDescription(notice._id)}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm mt-2"
                        >
                          {expandedNotices[notice._id]
                            ? "Show Less"
                            : "Show More"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notice.caption && (
                      <h3 className="text-lg font-semibold text-gray-900">
                        {notice.caption}
                      </h3>
                    )}
                    <img
                      src={notice.imagePath}
                      alt={notice.caption || "Notice image"}
                      className="w-full h-auto rounded-lg object-cover"
                    />
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
              <p className="text-gray-600 text-lg">
                No notices found for the selected date range.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Delete Notice?
            </h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this notice? This action cannot be
              undone.
            </p>
            <div className="flex gap-3 justify-end pt-4">
              <Button
                onClick={() => setDeleteConfirmId(null)}
                variant="secondary"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDeleteNotice(deleteConfirmId)}
                variant="primary"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
