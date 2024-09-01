import React from 'react';
import NextImage from 'next/image';
import { IconSpinner } from '@/components/ui/icons';

interface ImageProps {
  src: string;
  alt: string;
  isLoading: boolean;
  width?: number;
  height?: number;
}

export function Image({ src, alt, isLoading, width = 500, height = 300 }: ImageProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <NextImage
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="rounded-lg"
        />
      </div>
      <div
        className={`flex flex-row gap-2 items-center ${isLoading ? 'opacity-100' : 'opacity-0'}`}
      >
        <IconSpinner />
        <div className="text-zinc-500 text-sm">Analyzing image...</div>
      </div>
    </div>
  );
}