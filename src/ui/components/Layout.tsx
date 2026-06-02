/**
 * Layout — 主布局
 * 侧边栏 + 内容区
 */

import React from "react";
import { Sidebar } from "./Sidebar";
import type { PageKey } from "./Sidebar";

interface LayoutProps {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  children: React.ReactNode;
}

const layoutStyle: React.CSSProperties = {
  display: "flex",
  height: "100vh",
  overflow: "hidden",
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

export const Layout: React.FC<LayoutProps> = ({ currentPage, onNavigate, children }) => {
  return (
    <div style={layoutStyle}>
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <main style={contentStyle}>{children}</main>
    </div>
  );
};