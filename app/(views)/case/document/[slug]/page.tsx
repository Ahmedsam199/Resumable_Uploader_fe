"use client";

import axios from "axios";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Routes from "@/Routes.json";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderClosed } from "lucide-react";
import { Button } from "@/components/ui/button";
import DocumentForm from "./DocumentForm";
import FilesModal from "./folderModal";
export default function Page() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const { slug } = useParams();
  const [modalState, setModalState] = useState({
    open: false,
    data: null,
  });
  const [modalFile, setModalFile] = useState({
    open: false,
    data: null,
  });
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${Routes.case}/${slug}`);
      setData(response.data);
    } catch (error) {
      console.log("Error fetching data");
    }
    setLoading(false);
  };
  useEffect(() => {
    fetchData();
  }, []);
  if (loading) {
    return <div>Loading</div>;
  }
  return (
    <div className="flex gap-5 flex-col ">
      <Card>
        <CardHeader>
          <div className="mb-8 flex justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Cases</h1>
              <p className="text-neutral-600 text-lg">All Cases</p>
            </div>
            <DocumentForm
              refresh={() => {
                fetchData();
              }}
              setModalState={setModalState}
              modalState={modalState}
            />
            <FilesModal setModalState={setModalFile} modalState={modalFile} />
            <Button
              onClick={() => {
                setModalState({ open: true, data: { caseId: slug } });
              }}
            >
              New
            </Button>
          </div>
          <CardTitle>Case Info</CardTitle>
        </CardHeader>
        <CardContent>Name: {data.name}</CardContent>
      </Card>
      {data?.Document?.map((document) => (
        <Card
          key={document.id}
          onClick={() => {
            setModalFile({ open: true, data: { ...document } });
          }}
          className="hover:bg-amber-50 hover:scale-101 transition-all  duration-300 cursor-pointer"
        >
          <CardHeader>
            <CardTitle className="flex items-center text-center space-x-2">
              <FolderClosed />
              <span>{document.name}</span>
            </CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
