import { useRef, useState, useMemo } from "react"
import { Plus, Trash2, Edit2, Search, X, ArrowLeft } from "lucide-react"
import Button from "../../components/Button"
import ImageUploadField from "../../components/ImageUploadField"

const selectClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
const inputClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
const labelClass = "block text-sm font-semibold text-gray-700 mb-2"

const SEMESTER_NAMES = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth"]
const YEAR_NAMES = ["First", "Second", "Third", "Fourth", "Fifth"]

const dummyFaculties = [
  { _id: "fac_bca", code: "BCA", name: "Bachelor of Computer Applications", structureType: "semester", maxLevel: 8 },
  { _id: "fac_bbs", code: "BBS", name: "Bachelor of Business Studies", structureType: "year", maxLevel: 4 },
]

function getLevelLabel(structureType, level) {
  const names = structureType === "semester" ? SEMESTER_NAMES : YEAR_NAMES
  const name = names[level - 1] || `Level ${level}`
  return structureType === "semester" ? `${name} Semester` : `${name} Year`
}

function stripHtml(html = "") {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ")
}

export default function Resources() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedFacultyId, setSelectedFacultyId] = useState("")
  const [selectedLevel, setSelectedLevel] = useState("")

  const [resources, setResources] = useState([])
  const [editingId, setEditingId] = useState(null)

  const [resourceType, setResourceType] = useState("text")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("") // HTML
  const [images, setImages] = useState([]) // { id, file, url, title, caption }
  const [viewingResource, setViewingResource] = useState(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [currentImageFile, setCurrentImageFile] = useState(null)
  const [currentImagePreview, setCurrentImagePreview] = useState(null)
  const [imageUploadError, setImageUploadError] = useState(null)
  const [currentImageTitle, setCurrentImageTitle] = useState("")
  const [currentImageCaption, setCurrentImageCaption] = useState("")
  const [textFormatting, setTextFormatting] = useState({
    isBold: false,
    isUnderline: false,
  })
  const [selectedImage, setSelectedImage] = useState(null)
  const descriptionRef = useRef(null)

  const faculty = dummyFaculties.find((f) => f._id === selectedFacultyId)

  const levelOptions = useMemo(() => {
    if (!faculty) return []
    const max = faculty.maxLevel
    return Array.from({ length: max }, (_, i) => ({ value: i + 1, label: getLevelLabel(faculty.structureType, i + 1) }))
  }, [faculty])

  const resetForm = () => {
    setResourceType("text")
    setTitle("")
    setDescription("")
    setImages([])
    setEditingId(null)
    setTextFormatting({ isBold: false, isUnderline: false })
    setCurrentImageTitle("")
    setCurrentImageCaption("")
    clearImageSelection()
  }

  const clearImageSelection = () => {
    if (currentImagePreview) URL.revokeObjectURL(currentImagePreview)
    setCurrentImageFile(null)
    setCurrentImagePreview(null)
    setImageUploadError(null)
  }

  const handleImageFileSelect = (file, errorMessage) => {
    if (currentImagePreview) URL.revokeObjectURL(currentImagePreview)
    if (!file) {
      setCurrentImageFile(null)
      setCurrentImagePreview(null)
      setImageUploadError(errorMessage)
      return
    }
    setCurrentImageFile(file)
    setCurrentImagePreview(URL.createObjectURL(file))
    setImageUploadError(null)
  }

  const handleAddCurrentImage = () => {
    if (!currentImageFile) {
      setImageUploadError("Please select an image")
      return
    }
    if (!currentImageTitle.trim()) {
      setImageUploadError("Please enter a title for this image")
      return
    }
    const url = currentImagePreview
    setImages((prev) => [...prev, {
      id: `img_${Date.now()}`,
      file: currentImageFile,
      url,
      title: currentImageTitle,
      caption: currentImageCaption,
    }])
    if (currentImagePreview) URL.revokeObjectURL(currentImagePreview)
    setCurrentImageFile(null)
    setCurrentImagePreview(null)
    setImageUploadError(null)
  }

  const closeEditor = () => {
    setShowAddModal(false)
    setSelectedFacultyId("")
    setSelectedLevel("")
    resetForm()
  }

  const openEditorForNew = () => {
    resetForm()
    setShowAddModal(true)
  }

  const handleStartCreate = () => {
    if (!selectedFacultyId || !selectedLevel) return
    setShowAddModal(false)
    // editor is visible because faculty+level remain selected
    resetForm()
  }

  const updateTextFormattingState = () => {
    setTextFormatting({
      isBold: document.queryCommandState("bold"),
      isUnderline: document.queryCommandState("underline"),
    })
  }

  const applyFormatting = (type) => {
    const el = descriptionRef.current
    if (!el) return
    el.focus()
    document.execCommand(type)
    updateTextFormattingState()
  }

  const handleRemoveImage = (id) => setImages((prev) => prev.filter((i) => i.id !== id))

  const handleSave = () => {
    if (!selectedFacultyId || !selectedLevel) return
    if (resourceType === "text" && !stripHtml(description).trim()) return

    const doc = {
      _id: editingId || `res_${Date.now()}`,
      facultyId: selectedFacultyId,
      level: Number(selectedLevel),
      type: resourceType,
      title: (title && title.trim()) || null,
      description: description || null,
      images: images.map((i) => ({ id: i.id, name: i.file?.name || i.url, title: i.title, caption: i.caption, url: i.url })),
      createdAt: editingId ? resources.find((r) => r._id === editingId)?.createdAt : new Date().toISOString(),
    }

    if (editingId) {
      setResources((prev) => prev.map((r) => (r._id === editingId ? doc : r)))
    } else {
      setResources((prev) => [doc, ...prev])
    }
    // close editor after publish
    closeEditor()
  }

  const handleEdit = (res) => {
    setViewingResource(null)
    setSelectedFacultyId(res.facultyId)
    setSelectedLevel(String(res.level))
    setEditingId(res._id)
    setResourceType(res.type)
    setTitle(res.title || "")
    setDescription(res.description || "")
    setImages((res.images || []).map((im) => ({ id: im.id, file: null, url: im.url, title: im.title || "", caption: im.caption || "" })))
    setTextFormatting({ isBold: false, isUnderline: false })
    // ensure contentEditable shows the HTML
    setTimeout(() => {
      if (descriptionRef.current) {
        descriptionRef.current.innerHTML = res.description || ""
        updateTextFormattingState()
      }
    }, 50)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleDelete = (id) => {
    if (!window.confirm("Delete this resource?")) return
    setResources((prev) => prev.filter((r) => r._id !== id))
    setViewingResource((v) => (v?._id === id ? null : v))
  }

  const sortedResources = useMemo(() => {
    return resources.slice().sort((a, b) => {
      const aTitle = (a.title || "").toLowerCase()
      const bTitle = (b.title || "").toLowerCase()
      return aTitle.localeCompare(bTitle)
    })
  }, [resources])

  const filtered = useMemo(() => {
    return sortedResources.filter((r) => {
      if (searchQuery && !r.title) return false
      return r.title?.toLowerCase().includes(searchQuery.toLowerCase()) || !searchQuery
    })
  }, [sortedResources, searchQuery])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Resources</h1>
        <p className="mt-1 text-gray-600">Upload notes and important questions for your students.</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full max-w-lg">
          <label className="sr-only">Search</label>
          <div className="relative flex-1">
            <input
              placeholder="Search by title…"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 pl-10 focus:outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          </div>
        </div>

        <div>
          <Button className="inline-flex items-center gap-2" onClick={openEditorForNew} variant="primary">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      {/* Modal: select faculty/level */}
      {showAddModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-bold">Choose faculty & level</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Faculty</label>
                <select className={selectClass} value={selectedFacultyId} onChange={(e) => setSelectedFacultyId(e.target.value)}>
                  <option value="">Select faculty</option>
                  {dummyFaculties.map((f) => (
                    <option key={f._id} value={f._id}>{f.code} — {f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Semester / Year</label>
                <select className={selectClass} value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} disabled={!selectedFacultyId}>
                  <option value="">Select level</option>
                  {levelOptions.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={closeEditor}>Cancel</Button>
              <Button onClick={handleStartCreate} variant="primary">Proceed</Button>
            </div>
          </div>
        </div>
      )}

      {/* Editor area (shown when faculty+level selected or editing) */}
      {(selectedFacultyId && selectedLevel) && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Faculty: <strong>{faculty?.code}</strong> · {getLevelLabel(faculty?.structureType, Number(selectedLevel))}</p>
              <p className="text-xs text-gray-400">Create a text note or upload multiple images with titles and captions.</p>
            </div>
            {editingId && <p className="text-sm text-gray-500">Editing</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <div className="flex gap-3">
                <button type="button" onClick={() => setResourceType("text")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${resourceType === "text" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>Text resource</button>
                <button type="button" onClick={() => setResourceType("images")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${resourceType === "images" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>Image(s)</button>
              </div>

              {resourceType === "text" && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className={labelClass}>Title</label>
                    <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Description</label>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormatting("bold")} className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
                        textFormatting.isBold
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}>B</button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormatting("underline")} className={`px-4 py-2 rounded underline text-sm font-semibold transition-colors ${
                        textFormatting.isUnderline
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}>U</button>
                    </div>
                    <div
                      ref={descriptionRef}
                      contentEditable
                      suppressContentEditableWarning
                      dir="ltr"
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 min-h-30 focus:outline-none focus:ring-2 focus:ring-blue-600 whitespace-pre-wrap wrap-break-word text-left"
                      style={{ textAlign: "left" }}
                      onInput={(e) => setDescription(e.currentTarget.innerHTML)}
                      onKeyUp={updateTextFormattingState}
                      onMouseUp={updateTextFormattingState}
                    />
                  </div>
                </div>
              )}

              {resourceType === "images" && (
                <div className="mt-4 space-y-4">
                  <ImageUploadField
                    label="Resource image"
                    file={currentImageFile}
                    previewUrl={currentImagePreview}
                    onFileSelect={handleImageFileSelect}
                    onClear={clearImageSelection}
                    error={imageUploadError}
                  />

                  {/* Image Title */}
                  <div>
                    <label className={labelClass}>Image Title <span className="text-red-500">*</span></label>
                    <input 
                      type="text"
                      className={inputClass} 
                      value={currentImageTitle} 
                      onChange={(e) => setCurrentImageTitle(e.target.value)}
                      placeholder="Enter a title for all uploaded images"
                    />
                    <p className="mt-2 text-xs text-gray-500">This title and caption will be applied to each image you add until you change them.</p>
                  </div>

                  {/* Image Caption */}
                  <div>
                    <label className={labelClass}>Image Caption (Optional)</label>
                    <input 
                      type="text"
                      className={inputClass} 
                      value={currentImageCaption} 
                      onChange={(e) => setCurrentImageCaption(e.target.value)}
                      placeholder="Enter a caption for all uploaded images"
                    />
                  </div>

                  {/* Add Image Button */}
                  <button 
                    type="button" 
                    onClick={handleAddCurrentImage}
                    className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
                  >
                    Add Image
                  </button>

                  {/* Images Grid */}
                  {images.length > 0 && (
                    <div className="mt-6">
                      <h4 className="mb-4 text-sm font-semibold text-gray-700">Added Images ({images.length})</h4>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                        {images.map((img) => (
                          <div key={img.id} className="rounded-lg border border-gray-200 p-3 shadow-sm">
                            <div className="h-40 overflow-hidden rounded-md bg-gray-50 flex items-center justify-center">
                              {img.url ? (
                                <img src={img.url} alt={img.title || "Resource image"} className="h-full w-full object-cover" />
                              ) : (
                                <div className="text-sm text-gray-500">No image</div>
                              )}
                            </div>
                            <p className="mt-3 font-medium text-gray-900 truncate">{img.title}</p>
                            {img.caption && <p className="mt-1 text-xs text-gray-600 line-clamp-2">{img.caption}</p>}
                            <button type="button" onClick={() => handleRemoveImage(img.id)} className="mt-3 w-full rounded bg-red-50 py-2 text-sm font-semibold text-red-600 hover:bg-red-100">Remove</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
                <p className="font-semibold">Preview</p>
                <p className="mt-2 text-xs text-gray-600">Resources will appear as cards to students. You can edit or delete after saving.</p>
                <div className="mt-3">
                  <p className="text-sm font-medium">Title</p>
                  <p className="text-sm text-gray-700 truncate">{title || "(no title)"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={closeEditor}>Cancel</Button>
            <Button variant="secondary" onClick={resetForm}>Reset</Button>
            <Button variant="primary" onClick={handleSave}>{editingId ? "Update" : "Publish"}</Button>
          </div>
        </div>
      )}

      {/* Resource cards grid or single resource view */}
      {!viewingResource && (
        <div>
          <h3 className="mb-4 text-lg font-bold">All resources</h3>
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white py-12 text-center text-gray-600">No resources yet.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
              {filtered.map((r) => (
                <div key={r._id} onClick={() => setViewingResource(r)} className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 truncate">{r.title || (r.type === 'images' ? r.images?.[0]?.title || 'Untitled image resource' : '(untitled)')}</p>
                      <p className="mt-1 text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(r) }} className="text-sm text-blue-600"><Edit2 /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(r._id) }} className="text-sm text-red-600"><Trash2 /></button>
                    </div>
                  </div>

                  {r.images && r.images.length > 0 && (
                    <div className="mb-3 overflow-hidden rounded-xl bg-gray-50">
                      <img src={r.images[0].url} alt={r.images[0].title || r.images[0].name} className="h-40 w-full object-cover" />
                    </div>
                  )}

                  {r.description && <div className="mt-3 text-sm text-gray-700 line-clamp-3" dangerouslySetInnerHTML={{ __html: r.description }} />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {viewingResource && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" className="inline-flex items-center justify-center p-2" onClick={() => { setViewingResource(null); setSelectedImage(null); }}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-xl font-bold">{viewingResource.title || "Resource"}</h2>
                <p className="text-xs text-gray-500">{new Date(viewingResource.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleEdit(viewingResource)} className="text-sm text-blue-600"><Edit2 /></button>
              <button onClick={() => handleDelete(viewingResource._id)} className="text-sm text-red-600"><Trash2 /></button>
            </div>
          </div>

          {viewingResource.description && (
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: viewingResource.description }} />
          )}

          {viewingResource.images && viewingResource.images.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Images</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-3">
                {viewingResource.images.map((img) => (
                  <div key={img.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                    <button
                      type="button"
                      onClick={() => setSelectedImage(img)}
                      className="group block h-64 overflow-hidden rounded-xl bg-white"
                    >
                      <img src={img.url} alt={img.title || img.name} className="h-full w-full object-cover transition duration-200 group-hover:scale-105" />
                    </button>
                    <p className="mt-3 font-medium text-gray-900">{img.title || "Untitled image"}</p>
                    {img.caption && <p className="mt-1 text-sm text-gray-600">{img.caption}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-4xl">
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-gray-700 shadow-sm hover:bg-white"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="overflow-hidden rounded-3xl bg-white shadow-xl">
              <img src={selectedImage.url} alt={selectedImage.title || selectedImage.name} className="w-full object-contain" />
              <div className="p-4">
                <p className="text-lg font-semibold text-gray-900">{selectedImage.title || "Image"}</p>
                {selectedImage.caption && <p className="mt-2 text-sm text-gray-600">{selectedImage.caption}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}