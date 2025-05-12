"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useFastAPIRuntime, useWebSearchStore } from "./custom-runtime";
import { WebSearchToggle } from "./WebSearchToggle";
import { CustomThread } from "./CustomThread";

export const Assistant = () => {
  const runtime = useFastAPIRuntime();
  
  const setWebSearchEnabled = useWebSearchStore((state) => state.setWebSearchEnabled);

  const handleWebSearchToggle = (enabled: boolean) => {
    setWebSearchEnabled(enabled);
    console.log(`Web search ${enabled ? 'enabled' : 'disabled'}`);
  };

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Build Your Own ChatGPT UX
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    Starter Template
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <WebSearchToggle onToggle={handleWebSearchToggle} />
            </div>
          </header>
          <CustomThread />
        </SidebarInset>
      </SidebarProvider>
    </AssistantRuntimeProvider>
  );
};
