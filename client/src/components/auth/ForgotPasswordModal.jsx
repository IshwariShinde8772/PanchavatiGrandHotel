import Modal from "../common/Modal";
import { useTranslation } from "react-i18next";

export default function ForgotPasswordModal(props) {
  const { t } = useTranslation();
  return <Modal {...props} title={t("auth.forgotTitle")} />;
}
