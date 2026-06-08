import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { tva, type VariantProps } from '@gluestack-ui/utils/nativewind-utils';

const textStyle = tva({
  base: 'text-typography-800',
  variants: {
    size: {
      '2xs': 'text-[10px]',
      xs:    'text-xs',
      sm:    'text-sm',
      md:    'text-base',
      lg:    'text-lg',
      xl:    'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl',
    },
    bold:   { true: 'font-bold' },
    italic: { true: 'italic' },
    strikeThrough: { true: 'line-through' },
    underline:     { true: 'underline' },
  },
});

const headingStyle = tva({
  base: 'text-typography-900 font-bold',
  variants: {
    size: {
      xs:    'text-xl',
      sm:    'text-2xl',
      md:    'text-3xl',
      lg:    'text-4xl',
      xl:    'text-5xl',
      '2xl': 'text-6xl',
    },
  },
});

type TextVariants = VariantProps<typeof textStyle>;
type ITextProps = TextProps & TextVariants & { className?: string };

const Text = React.forwardRef<RNText, ITextProps>(
  ({ className, size = 'md', bold, italic, strikeThrough, underline, ...props }, ref) => (
    <RNText
      ref={ref}
      {...props}
      className={textStyle({ size, bold, italic, strikeThrough, underline, class: className })}
    />
  ),
);
Text.displayName = 'Text';

type HeadingVariants = VariantProps<typeof headingStyle>;
type IHeadingProps = TextProps & HeadingVariants & { className?: string };

const Heading = React.forwardRef<RNText, IHeadingProps>(
  ({ className, size = 'md', ...props }, ref) => (
    <RNText
      ref={ref}
      {...props}
      className={headingStyle({ size, class: className })}
    />
  ),
);
Heading.displayName = 'Heading';

export { Text, Heading };
