import { useState } from "react"
import { X, ChevronDown, Calendar } from "lucide-react"
import Button from "../../components/Button"
import TitleDescription from "../../components/TitleDescription"
import ImageCaption from "../../components/ImageCaption"
import ImageUploadField from "../../components/ImageUploadField"
import { NOTICE_IMAGE_UPLOAD_PATH } from "../../constants/uploads"
import { uploadNoticeImage } from "../../utils/noticeImageUpload"

// Dummy data - simulating MongoDB documents
const dummyNotices = [
  {
    _id: "1",
    type: "text",
    title: "Mid-Semester Exams Schedule",
    description: "The mid-semester exams will be conducted from June 15th to June 22nd, 2024. All students are requested to check their exam schedule on the student portal. Please report 15 minutes before the scheduled time.",
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
    description: "Please note that the library will remain open until 8 PM on weekdays and 5 PM on weekends during the examination period. All borrowed books must be returned within the due date to avoid penalties.",
    createdAt: "2024-05-08",
  },
  {
    _id: "4",
    type: "image",
    caption: "New Computer Lab Inaugurated",
    imagePath: NOTICE_IMAGE_UPLOAD_PATH,
    createdAt: "2024-05-01",
  },
]

export default function Notices() {
  const [showAddNotice, setShowAddNotice] = useState(false)
  const [noticeType, setNoticeType] = useState("text") // "text" or "image"
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    caption: "",
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageUploadError, setImageUploadError] = useState(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [notices, setNotices] = useState(dummyNotices)
  const [showAllNotices, setShowAllNotices] = useState(false)
  const [selectedDateRange, setSelectedDateRange] = useState({
    from: "",
    to: "",
  })
  const [textFormatting, setTextFormatting] = useState({
    isBold: false,
    isItalic: false,
    isUnderline: false,
  })

  const clearImageSelection = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview(null)
    setImageUploadError(null)
  }

  const handleImageFileSelect = (file, errorMessage) => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    if (!file) {
      setImageFile(null)
      setImagePreview(null)
      setImageUploadError(errorMessage)
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setImageUploadError(null)
  }

  const handleAddNotice = async () => {
    if (noticeType === "text" && (formData.title || formData.description)) {
      const newNotice = {
        _id: Date.now().toString(),
        type: "text",
        title: formData.title,
        description: formData.description,
        createdAt: new Date().toISOString().split("T")[0],
      }
      setNotices([newNotice, ...notices])
      resetForm()
      return
    }

    if (noticeType === "image" && imageFile) {
      setIsPublishing(true)
      try {
        const { imagePath } = await uploadNoticeImage(imageFile)
        const newNotice = {
          _id: Date.now().toString(),
          type: "image",
          caption: formData.caption,
          imagePath,
          originalFileName: imageFile.name,
          createdAt: new Date().toISOString().split("T")[0],
        }
        setNotices([newNotice, ...notices])
        resetForm()
      } catch {
        setImageUploadError("Could not upload image. Please try again.")
      } finally {
        setIsPublishing(false)
      }
    } else if (noticeType === "image") {
      setImageUploadError("Please upload an image for this notice.")
    }
  }

  const resetForm = () => {
    clearImageSelection()
    setFormData({ title: "", description: "", caption: "" })
    setShowAddNotice(false)
    setTextFormatting({ isBold: false, isItalic: false, isUnderline: false })
  }

  const canPublishImageNotice = noticeType === "image" && imageFile && !isPublishing
  const canPublishTextNotice =
    noticeType === "text" && (formData.title || formData.description)

  const filteredNotices = notices.filter((notice) => {
    if (!selectedDateRange.from && !selectedDateRange.to) return true
    const noticeDate = new Date(notice.createdAt)
    const fromDate = selectedDateRange.from ? new Date(selectedDateRange.from) : null
    const toDate = selectedDateRange.to ? new Date(selectedDateRange.to) : null

    if (fromDate && noticeDate < fromDate) return false
    if (toDate && noticeDate > toDate) return false
    return true
  })

  const displayedNotices = showAllNotices ? filteredNotices : filteredNotices.slice(0, 1)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notices</h1>
          <p className="text-gray-600 mt-1">Manage and view all academic notices</p>
        </div>
        <Button
          onClick={() => setShowAddNotice(!showAddNotice)}
          variant="primary"
          size="lg"
        >
          + Add Notice
        </Button>
      </div>

      {/* Add Notice Section */}
      {showAddNotice && (
        <div className="bg-white border-2 border-blue-200 rounded-lg p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Add New Notice</h2>
            <button
              onClick={() => resetForm()}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Notice Type Selection */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="text"
                checked={noticeType === "text"}
                onChange={(e) => {
                  setNoticeType(e.target.value)
                  if (e.target.value === "text") clearImageSelection()
                }}
                className="w-4 h-4"
              />
              <span className="text-gray-700 font-medium">Text Notice (Title & Description)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="image"
                checked={noticeType === "image"}
                onChange={(e) => setNoticeType(e.target.value)}
                className="w-4 h-4"
              />
              <span className="text-gray-700 font-medium">Image Notice (With Caption)</span>
            </label>
          </div>

          {/* Text Notice Form */}
          {noticeType === "text" && (
            <div className="space-y-6">
              {/* Text Formatting Toolbar */}
              <div className="flex gap-2 border-b border-gray-200 pb-4">
                <button
                  onClick={() =>
                    setTextFormatting({ ...textFormatting, isBold: !textFormatting.isBold })
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
                    setTextFormatting({ ...textFormatting, isItalic: !textFormatting.isItalic })
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
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                    setFormData({ ...formData, description: e.target.value })
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
                  onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                  placeholder="Enter caption for the image..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
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
      )}

      {/* View Notice History Section */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Notice History</h2>
          {!showAllNotices && filteredNotices.length > 1 && (
            <Button
              onClick={() => setShowAllNotices(true)}
              variant="outline"
              size="sm"
            >
              View All Notices
            </Button>
          )}
        </div>

        {/* Date Filter */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <input
              type="date"
              value={selectedDateRange.from}
              onChange={(e) =>
                setSelectedDateRange({ ...selectedDateRange, from: e.target.value })
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <span className="text-gray-600 font-medium">to</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDateRange.to}
              onChange={(e) =>
                setSelectedDateRange({ ...selectedDateRange, to: e.target.value })
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                {/* Notice Date Badge */}
                <div className="mb-4">
                  <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                    {new Date(notice.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>

                {/* Notice Content */}
                {notice.type === "text" ? (
                  <TitleDescription
                    title={notice.title}
                    description={notice.description}
                  />
                ) : (
                  <ImageCaption
                    imagePath={notice.imagePath}
                    caption={notice.caption}
                  />
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
              <p className="text-gray-600 text-lg">No notices found for the selected date range.</p>
            </div>
          )}
        </div>

        {/* Show All Toggle */}
        {showAllNotices && filteredNotices.length > 1 && (
          <div className="flex justify-center">
            <Button
              onClick={() => setShowAllNotices(false)}
              variant="secondary"
            >
              <ChevronDown className="w-4 h-4 mr-2" />
              Show Less
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
