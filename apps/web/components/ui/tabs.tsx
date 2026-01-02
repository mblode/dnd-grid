"use client";

import { Content, List, Root, Trigger } from "@radix-ui/react-tabs";
import {
  type ComponentPropsWithoutRef,
  type ElementRef,
  forwardRef,
} from "react";

import { cn } from "@/lib/utils";

const Tabs = Root;

const TabsList = forwardRef<
  ElementRef<typeof List>,
  ComponentPropsWithoutRef<typeof List>
>(({ className, ...props }, ref) => (
  <List
    className={cn(
      "inline-flex items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    ref={ref}
    {...props}
  />
));

TabsList.displayName = List.displayName;

const TabsTrigger = forwardRef<
  ElementRef<typeof Trigger>,
  ComponentPropsWithoutRef<typeof Trigger>
>(({ className, ...props }, ref) => (
  <Trigger
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 font-medium text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    ref={ref}
    {...props}
  />
));

TabsTrigger.displayName = Trigger.displayName;

const TabsContent = forwardRef<
  ElementRef<typeof Content>,
  ComponentPropsWithoutRef<typeof Content>
>(({ className, ...props }, ref) => (
  <Content className={cn("mt-4", className)} ref={ref} {...props} />
));

TabsContent.displayName = Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
