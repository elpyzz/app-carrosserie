"use client"

import { RelanceHistory } from "./RelanceHistory"

export function RelanceExpertsHistory() {
  return (
    <RelanceHistory 
      relanceTypes={["expert_portail", "expert_email", "client_sms", "client_email"]}
      title="Historique des relances experts et clients"
    />
  )
}
