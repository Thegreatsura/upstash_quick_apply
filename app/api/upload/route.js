import { NextResponse } from "next/server";
import path from "path";
import { writeFile } from "fs/promises";
import { google } from 'googleapis';
import dotenv from 'dotenv';
import { createReadStream } from 'fs';
import stream from 'stream';
dotenv.config();

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const SAFE_UUID_RE = /^[A-Za-z0-9_-]{1,80}$/;

const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/drive.file'],
    credentials: {
        private_key: process.env.GOOGLE_PRIVATE_KEY,
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
    },
});

async function uploadFile(filename, buffer) {
    const drive = google.drive({ version: 'v3', auth });

    const file1 = await drive.files.create({
        media: {
            mimeType: 'application/pdf',
            body: new stream.PassThrough().end(buffer)
        },
        requestBody: {
            name: filename,
            parents: [process.env.GOOGLE_DRIVE_ID],
            fields: 'id',
        },
    });
    console.log(file1.data);
}

export const POST = async (req, res) => {
    const formData = await req.formData();
    const uuid = formData.get("uuid");
    const file = formData.get("file");

    if (typeof uuid !== "string" || !SAFE_UUID_RE.test(uuid)) {
        return NextResponse.json({ error: "Invalid upload identifier." }, { status: 400 });
    }

    if (!file) {
        return NextResponse.json({ error: "No files received." }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
        return NextResponse.json({ error: "Only PDF uploads are allowed." }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        return NextResponse.json({ error: "File too large." }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const filename = `${uuid}.pdf`;
    console.log(filename);

    try {
        /*
        await writeFile(
            path.join(process.cwd(), "cv_folder/" + filename),
            buffer
        );*/
        await uploadFile(filename, buffer);
        return NextResponse.json({ Message: "Success", status: 201 });
    } catch (error) {
        console.log("Error occurred ", error);
        return NextResponse.json({ Message: "Failed", status: 500 });
    }
};
