"use client"
import getRelevantFiles from "@/app/lib/repo/getRelevantFiles";
import { error } from "console";
import { useSession } from "next-auth/react";
import { useState } from "react";


export async function POST() {

    try {
        const { reponame } = await req.json();
        if (!reponame) {
            return Response.json(
                { error: "Missing Parameters" },
                { status: 404 })
        }
        getRelevantFiles({ reponame });

    }


    catch {

    }


}