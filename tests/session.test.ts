import test from "node:test";
import assert from "node:assert/strict";
import { handlePrepareMusicSession as prepare } from "../src/tools/session.ts";
import { createMusicMcpServer } from "../src/server.ts";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

const base={work_id:"take",owner:"FrankX",artist_profile_ref:"FrankX/session/v1",engine:"suno-supervised",
 style:"Close dry alto; swung garage-house; clean sub; short ending",lyrics:"[Chorus]\nLeave your coat here",
 instrumental:false,duration_s:120,candidates:1,budget_usd:1};

test("native preparation never authorizes credits or claims audio",()=>{
 const r=prepare(base); assert.equal(r.authorization,"not_authorized_by_this_packet");
 assert.equal(r.execution_status,"not_submitted");assert.equal(r.audio_verdict,"not_listened");
 assert.equal(r.estimated_render_cost_usd,null);
});
test("malicious/unbudgeted packets fail at the boundary",()=>{
 assert.throws(()=>prepare({...base,api_key:"fixture"}));
 assert.throws(()=>prepare({...base,artist_profile_ref:"Arcanea/another"}));
 assert.throws(()=>prepare({...base,engine:"minimax-fal3",budget_usd:0}));
});
test("translation preserves approved lyric and current provider model",()=>{
 const r=prepare({...base,engine:"minimax-fal3"});
 assert.equal(r.model,"minimax/music-3");assert.equal(r.requests[0].request.body?.lyrics,base.lyrics);
 assert.throws(()=>prepare({...base,engine:"minimax-fal3",lyrics:"[Chorus] dropped line"}));
});
test("MCP advertises and calls the prepared-only tool",async()=>{
 const [clientSide,serverSide]=InMemoryTransport.createLinkedPair();
 const server=createMusicMcpServer();const client=new Client({name:"session-test",version:"1"});
 await Promise.all([server.connect(serverSide),client.connect(clientSide)]);
 try {
   const list=await client.listTools();assert.ok(list.tools.some(t=>t.name==="prepare_music_session"));
   const result=await client.callTool({name:"prepare_music_session",arguments:base});
   assert.equal(result.isError,undefined);
   const blocks=result.content as Array<{type:string;text?:string}>;
   const value=JSON.parse(blocks[0].text!);assert.equal(value.execution_status,"not_submitted");
 } finally {await client.close();await server.close();}
});
