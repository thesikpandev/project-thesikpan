import { NextRequest, NextResponse } from 'next/server';

// 증빙 파일 데이터 스토어
const evidenceFiles = new Map();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('memberId');
  const fileId = searchParams.get('fileId');
  
  if (fileId) {
    const file = evidenceFiles.get(fileId);
    if (file) {
      return NextResponse.json({
        result: 'SUCCESS',
        data: file
      });
    }
    return NextResponse.json({
      result: 'FAIL',
      message: 'File not found'
    }, { status: 404 });
  }
  
  let results = Array.from(evidenceFiles.values());
  
  if (memberId) {
    results = results.filter(f => f.memberId === memberId);
  }
  
  return NextResponse.json({
    result: 'SUCCESS',
    data: results,
    total: results.length
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const memberId = formData.get('memberId') as string;
    const file = formData.get('file') as File;
    const description = formData.get('description') as string;
    
    if (!memberId || !file) {
      return NextResponse.json({
        result: 'FAIL',
        message: 'Missing required fields'
      }, { status: 400 });
    }
    
    const fileId = `FILE${String(evidenceFiles.size + 1).padStart(3, '0')}`;
    
    const newFile = {
      fileId,
      memberId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      description: description || '',
      uploadedAt: new Date().toISOString(),
      status: 'UPLOADED'
    };
    
    evidenceFiles.set(fileId, newFile);
    
    return NextResponse.json({
      result: 'SUCCESS',
      data: newFile
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      result: 'FAIL',
      message: 'Invalid request'
    }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('fileId');
  
  if (!fileId) {
    return NextResponse.json({
      result: 'FAIL',
      message: 'File ID is required'
    }, { status: 400 });
  }
  
  if (!evidenceFiles.has(fileId)) {
    return NextResponse.json({
      result: 'FAIL',
      message: 'File not found'
    }, { status: 404 });
  }
  
  evidenceFiles.delete(fileId);
  
  return NextResponse.json({
    result: 'SUCCESS',
    message: 'File deleted successfully'
  });
}