import { NOTICE_IMAGE_UPLOAD_PATH } from "../constants/uploads"

/**
 * Upload notice image to the server.
 * @param {File} file
 * @returns {Promise<{ imagePath: string }>}
 */
export async function uploadNoticeImage(file) {
  // TODO: replace with real API call, e.g.:
  // const formData = new FormData()
  // formData.append("image", file)
  // const res = await fetch("/api/notices/upload", { method: "POST", body: formData })
  // return res.json()

  void file
  return { imagePath: NOTICE_IMAGE_UPLOAD_PATH }
}
