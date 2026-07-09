import { useEffect, useRef, useState } from "react";
import FileUpload from "../forms/FileUpload";
import InputField from "../forms/InputField";
import { uploadAPI } from "../../api/uploadAPI";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

export default function NationalityIDForm({ form, setForm, errors = {} }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const formRef = useRef(form);
  const uploadCountRef = useRef(0);
  const [cameraError, setCameraError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const updateForm = (patch) => {
    const next = { ...formRef.current, ...patch };
    formRef.current = next;
    setForm(next);
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setCameraReady(false);
  };

  useEffect(() => stopCamera, []);

  const uploadDocument = async (fieldPrefix, file, purpose) => {
    if (!file) {
      return;
    }

    uploadCountRef.current += 1;
    setUploadingDocument(true);
    updateForm({ _documents_uploading: true });
    try {
      const response = await uploadAPI.cloudinary(file, purpose);
      updateForm({
        [`${fieldPrefix}_url`]: response.data.url,
        [`${fieldPrefix}_public_id`]: response.data.public_id,
      });
      toast.success(t("shared.actionCompleted"));
      return true;
    } catch (error) {
      toast.error(t("shared.actionFailed"));
      return false;
    } finally {
      uploadCountRef.current = Math.max(uploadCountRef.current - 1, 0);
      const stillUploading = uploadCountRef.current > 0;
      setUploadingDocument(stillUploading);
      updateForm({ _documents_uploading: stillUploading });
    }
  };

  const startCamera = async () => {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(window.isSecureContext ? "Camera is not supported by this browser." : "Camera requires HTTPS or localhost.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      setCameraActive(true);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const video = videoRef.current;
      if (!video) throw new Error("Camera preview could not be initialized");
      video.srcObject = stream;
      await video.play();
    } catch (error) {
      stopCamera();
      if (error?.name === "NotAllowedError") setCameraError("Camera permission denied. Allow camera access and try again.");
      else if (error?.name === "NotFoundError") setCameraError("Camera not found.");
      else setCameraError(error?.message || "Unable to start camera.");
    }
  };

  const captureLivePhoto = async () => {
    const video = videoRef.current;
    if (!video || !cameraReady || video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) {
      toast.error("Camera is not ready yet. Please wait and try again.");
      return;
    }

    setCapturing(true);
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      if (!blob) {
        toast.error("Unable to capture photo. Please try again.");
        setCapturing(false);
        return;
      }

      const file = new File([blob], `live-photo-${Date.now()}.jpg`, { type: "image/jpeg" });
      const uploaded = await uploadDocument("live_photo", file, "customer-live-photos");
      if (uploaded) stopCamera();
      setCapturing(false);
    }, "image/jpeg", 0.9);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <InputField label={t("customer.nationality")} value={form.nationality || ""} onChange={(event) => updateForm({ nationality: event.target.value })} />
        <InputField label={`${t("customer.idExpiryDate")} (${t("shared.optional")})`} type="date" value={form.id_expiry || ""} onChange={(event) => updateForm({ id_expiry: event.target.value })} />
      </div>
      <FileUpload
        label={form.id_doc_url ? t("bookingUi.updateId") : t("bookingUi.uploadId")}
        currentFileLabel={form.id_doc_url ? "ID proof already uploaded" : ""}
        onChange={(event) => uploadDocument("id_doc", event.target.files?.[0], "customer-id-proofs")}
      />
      {errors.id_doc_url ? <p className="text-sm font-semibold text-red-600">{errors.id_doc_url}</p> : null}
      {form.id_doc_url ? <a className="text-sm font-semibold text-godavari" href={form.id_doc_url} target="_blank" rel="noreferrer">{t("bookingUi.viewId")}</a> : null}
      <div className="rounded-[24px] border border-divider p-4">
        <p className="mb-3 text-sm font-semibold">{t("bookingUi.capturePhoto")}</p>
        {cameraActive ? (
          <div className="space-y-3">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => setCameraReady(Boolean(videoRef.current?.videoWidth && videoRef.current?.videoHeight))}
              onCanPlay={() => setCameraReady(true)}
              className="max-h-72 w-full rounded-xl bg-black object-contain"
            />
            <div className="flex gap-3">
              <button type="button" disabled={!cameraReady || capturing} className="rounded-lg bg-vineyard px-4 py-2 text-sm font-bold text-white disabled:opacity-50" onClick={captureLivePhoto}>{capturing ? t("shared.processing") : cameraReady ? t("bookingUi.capture") : t("bookingUi.preparingCamera")}</button>
              <button type="button" className="rounded-lg border border-divider px-4 py-2 text-sm font-bold" onClick={stopCamera}>{t("common.cancel")}</button>
            </div>
          </div>
        ) : (
          <button type="button" className="rounded-lg bg-vineyard px-4 py-2 text-sm font-bold text-white" onClick={startCamera}>{t("bookingUi.openCamera")}</button>
        )}
        {cameraError ? <p className="mt-2 text-sm font-semibold text-red-600">{cameraError}</p> : null}
      </div>
      {errors.live_photo_url ? <p className="text-sm font-semibold text-red-600">{errors.live_photo_url}</p> : null}
      {form.live_photo_url ? <a className="text-sm font-semibold text-godavari" href={form.live_photo_url} target="_blank" rel="noreferrer">{t("bookingUi.viewLivePhoto")}</a> : null}
      {uploadingDocument ? <p className="text-sm font-semibold text-amber-700">{t("bookingUi.uploadWait")}</p> : null}
      <div className="rounded-[24px] bg-terracotta/10 p-4 text-sm text-mutedText">
        {t("bookingUi.idSecurityNotice")}
      </div>
    </div>
  );
}

