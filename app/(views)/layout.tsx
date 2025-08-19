// app/(admin)/layout.tsx
"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NavItem, navItems } from "../../navigational";
function NavItemComponent({
  item,
  isCollapsed = false,
}: {
  item: NavItem;
  isCollapsed?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  if (item.children) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={`w-full justify-between h-12 px-4 ${
              isCollapsed ? "px-2" : ""
            }`}
          >
            <div className="flex items-center">
              <item.icon className="h-5 w-5" />
              {!isCollapsed && <span className="ml-3">{item.title}</span>}
            </div>
            {!isCollapsed &&
              (isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              ))}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1">
          {item.children.map((child, index) => (
            <Link key={index} href={child.href || "#"}>
              <Button
                variant={pathname === child.href ? "secondary" : "ghost"}
                className={`w-full justify-start h-10 ${
                  isCollapsed ? "px-2" : "pl-8"
                }`}
              >
                <child.icon className="h-4 w-4" />
                {!isCollapsed && <span className="ml-3">{child.title}</span>}
              </Button>
            </Link>
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Link href={item.href || "#"}>
      <Button
        variant={pathname === item.href ? "secondary" : "ghost"}
        className={`w-full justify-start h-12 px-4 ${
          isCollapsed ? "px-2" : ""
        }`}
      >
        <item.icon className="h-5 w-5" />
        {!isCollapsed && <span className="ml-3">{item.title}</span>}
      </Button>
    </Link>
  );
}

function SidebarContent({ isCollapsed = false }: { isCollapsed?: boolean }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`p-4 border-b ${isCollapsed ? "px-2" : ""}`}>
        <h2 className={`font-bold text-lg ${isCollapsed ? "sr-only" : ""}`}>
          Admin Panel
        </h2>
        {isCollapsed && (
          <div className="w-8 h-7 bg-primary rounded flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">A</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-1  overflow-y-auto">
        {navItems.map((item, index) => (
          <NavItemComponent key={index} item={item} isCollapsed={isCollapsed} />
        ))}
      </nav>

      <div className={`p-4 border-t ${isCollapsed ? "px-2" : ""}`}>
        {isCollapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full p-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/admin.png" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Hola</DropdownMenuLabel>
              <DropdownMenuSeparator />
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src="/avatars/admin.png" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r bg-card transition-all duration-300 ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        <SidebarContent isCollapsed={isCollapsed} />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet>
        <div className="md:hidden">
          <div className="flex items-center justify-between p-2 border-b">
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
          </div>
        </div>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="hidden md:flex items-center justify-between p-3 border-b bg-card">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-4"></div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
