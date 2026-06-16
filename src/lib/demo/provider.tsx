"use client";

import React, { createContext, useContext, useState } from "react";
import { isDemoMode } from "./config";
import { demoApprovals, demoCalendarSlots, demoLeads, demoTasks, demoMessages, AIApprovalItem, CalendarSlot } from "./data";
import { Lead, LeadTask, Message } from "@/lib/types";

interface DemoContextType {
  isDemoActive: boolean;
  approvals: AIApprovalItem[];
  calendarSlots: CalendarSlot[];
  leads: Lead[];
  tasks: LeadTask[];
  messages: Message[];
  approveItem: (id: string, updatedDraft?: string) => void;
  rejectItem: (id: string) => void;
  addLeadTask: (task: Omit<LeadTask, "id" | "created_at" | "updated_at">) => void;
  toggleTaskStatus: (id: string) => void;
  sendDemoMessage: (conversationId: string, body: string, senderType?: "operator" | "system") => void;
}

const DemoContext = createContext<DemoContextType>({
  isDemoActive: false,
  approvals: [],
  calendarSlots: [],
  leads: [],
  tasks: [],
  messages: [],
  approveItem: () => {},
  rejectItem: () => {},
  addLeadTask: () => {},
  toggleTaskStatus: () => {},
  sendDemoMessage: () => {},
});

export const useDemo = () => useContext(DemoContext);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [isDemoActive] = useState(() => isDemoMode());
  const [approvals, setApprovals] = useState<AIApprovalItem[]>(demoApprovals);
  const [calendarSlots, setCalendarSlots] = useState<CalendarSlot[]>(demoCalendarSlots);
  const [leads, setLeads] = useState<Lead[]>(demoLeads);
  const [tasks, setTasks] = useState<LeadTask[]>(demoTasks);
  const [messages, setMessages] = useState<Message[]>(demoMessages);


  const approveItem = (id: string, updatedDraft?: string) => {
    const item = approvals.find((a) => a.id === id);
    if (!item) return;

    const newMsg: Message = {
      id: `msg-sim-${Date.now()}`,
      organization_id: "demo-org-id",
      channel_id: "channel-whatsapp",
      conversation_id: item.leadId === "lead-sibusiso" ? "conv-sibusiso" : `conv-${item.leadId}`,
      lead_id: item.leadId,
      direction: "outbound",
      sender_type: "system",
      sender_external_id: null,
      sender_display_name: "AgentFlow AI",
      external_message_id: `wa-sim-${Date.now()}`,
      body: updatedDraft || item.draftResponse,
      occurred_at: new Date().toISOString(),
      raw_payload: {},
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setApprovals((prev) => prev.filter((a) => a.id !== id));
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id === item.leadId) {
          return {
            ...l,
            pipeline_stage_id: "stage-govern",
            status: "qualified",
          };
        }
        return l;
      })
    );
  };

  const rejectItem = (id: string) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
  };

  const addLeadTask = (newTask: Omit<LeadTask, "id" | "created_at" | "updated_at">) => {
    const task: LeadTask = {
      ...newTask,
      id: `task-sim-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTasks((prev) => [...prev, task]);
  };

  const toggleTaskStatus = (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: t.status === "completed" ? "completed" : "open",
              completed_at: t.status === "completed" ? null : new Date().toISOString(),
            }
          : t
      )
    );
  };

  const sendDemoMessage = (conversationId: string, body: string, senderType: "operator" | "system" = "operator") => {
    const conv = approvals.find((a) => (a.leadId === "lead-sibusiso" ? "conv-sibusiso" : `conv-${a.leadId}`) === conversationId);
    const leadId = conv ? conv.leadId : "lead-sibusiso";

    const newMsg: Message = {
      id: `msg-user-sim-${Date.now()}`,
      organization_id: "demo-org-id",
      channel_id: "channel-whatsapp",
      conversation_id: conversationId,
      lead_id: leadId,
      direction: "outbound",
      sender_type: senderType,
      sender_external_id: null,
      sender_display_name: senderType === "operator" ? "Operator" : "AgentFlow AI",
      external_message_id: `wa-user-sim-${Date.now()}`,
      body,
      occurred_at: new Date().toISOString(),
      raw_payload: {},
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);
  };

  return (
    <DemoContext.Provider
      value={{
        isDemoActive,
        approvals,
        calendarSlots,
        leads,
        tasks,
        messages,
        approveItem,
        rejectItem,
        addLeadTask,
        toggleTaskStatus,
        sendDemoMessage,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}
