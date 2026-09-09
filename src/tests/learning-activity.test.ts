import { describe, expect, it } from "bun:test";
import { recordLearningActivity } from "../lib/academy-learning-activity.server";

const student = { id: "verified-student-id", email_confirmed_at: "2026-09-09T00:00:00Z" };
describe("Verified student return activity", () => {
  it("counts lesson/dashboard reading and tutor/progress actions with the verified user's ID", async () => {
    const calls: unknown[] = [];
    const db = { rpc: async (name: string, args: {p_user: string}) => { calls.push({name,args}); return {error:null}; } };
    for (const [method,path] of [["GET","lesson"],["GET","dashboard"],["POST","tutor"],["POST","progress"]]) {
      expect(await recordLearningActivity(db, student, method, path)).toBe(true);
    }
    expect(calls).toEqual(Array.from({length:4}, () => ({name:"academy_touch_learning_activity",args:{p_user:student.id}})));
  });
  it("excludes anonymous/unconfirmed users and staff, scheduler and other routes", async () => {
    let calls=0;
    const db = { rpc: async () => {calls++; return {error:null};} };
    await recordLearningActivity(db,null,"GET","lesson");
    await recordLearningActivity(db,{id:"unconfirmed"},"GET","dashboard");
    for (const [method,path] of [["GET","catalogue"],["GET","studio"],["POST","review"],["POST","process-integrations"],["GET","tutor"],["POST","lesson"]]) {
      expect(await recordLearningActivity(db,student,method,path)).toBe(false);
    }
    expect(calls).toBe(0);
  });
  it("reports a database failure without interrupting the student's learning request", async () => {
    let failures=0;
    expect(await recordLearningActivity({rpc:async()=>({error:{message:"private database detail"}})},student,"POST","tutor",()=>{failures++;})).toBe(false);
    expect(await recordLearningActivity({rpc:async()=>{throw new Error("private exception");}},student,"GET","lesson",()=>{failures++;})).toBe(false);
    expect(failures).toBe(2);
  });
});
