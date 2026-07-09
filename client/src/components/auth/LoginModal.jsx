import Modal from "../common/Modal";
import { useTranslation } from "react-i18next";

export default function LoginModal(props) {
  const { t } = useTranslation();
  return <Modal {...props} title={t("common.login")} />;
}

