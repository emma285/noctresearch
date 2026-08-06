import GarminUpload from "../../components/GarminUpload";

export const metadata = {
  title: "가민 수면 데이터 업로드 | Noct Research",
  description: "코칭 전 가민 수면 데이터를 업로드해 주세요.",
};

export default function UploadPage() {
  return <GarminUpload />;
}
