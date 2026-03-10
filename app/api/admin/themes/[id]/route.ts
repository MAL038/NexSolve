import { NextRequest } from "next/server";
import { PATCH as patchThema, DELETE as deleteThema } from "@/app/api/admin/themas/[themaId]/route";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return patchThema(req, { params: Promise.resolve({ themaId: id }) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return deleteThema(req, { params: Promise.resolve({ themaId: id }) });
}
