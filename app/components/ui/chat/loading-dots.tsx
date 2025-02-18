"use client";

export function LoadingDots() {
  return (
    <div className="flex space-x-1.5 items-center">
      <div className="w-2 h-2 rounded-full bg-blue-500 animate-[bounce_1s_infinite_0ms]"></div>
      <div className="w-2 h-2 rounded-full bg-blue-500 animate-[bounce_1s_infinite_200ms]"></div>
      <div className="w-2 h-2 rounded-full bg-blue-500 animate-[bounce_1s_infinite_400ms]"></div>
    </div>
  );
}
