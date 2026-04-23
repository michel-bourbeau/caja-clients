/**
 * StripeUI Component Library
 * 
 * Professional, reusable components inspired by Stripe's design system.
 * Minimal, elegant, and mobile-first.
 */

'use client';

import React from 'react';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUTTONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading, className, children, disabled, ...props },
    ref
  ) => {
    const variantClass = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      ghost: 'btn-ghost',
      danger: 'btn-danger',
    }[variant];

    const sizeClass = {
      sm: 'btn-sm',
      md: '',
      lg: 'btn-lg',
    }[size];

    return (
      <button
        ref={ref}
        className={`${variantClass} ${sizeClass} ${className || ''}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Cargando...
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CARDS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ size = 'md', className, children, ...props }, ref) => {
    const sizeClass = {
      sm: 'card-sm',
      md: '',
      lg: 'card-lg',
    }[size];

    return (
      <div ref={ref} className={`card ${sizeClass} ${className || ''}`} {...props}>
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }> = ({ className, children, ...props }) => (
  <div className={`card-header ${className || ''}`} {...props}>{children}</div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }> = ({ className, children, ...props }) => (
  <h2 className={`card-title ${className || ''}`} {...props}>{children}</h2>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }> = ({ className, children, ...props }) => (
  <p className={`card-description ${className || ''}`} {...props}>{children}</p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }> = ({ className, children, ...props }) => (
  <div className={`card-content ${className || ''}`} {...props}>{children}</div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }> = ({ className, children, ...props }) => (
  <div className={`card-footer ${className || ''}`} {...props}>{children}</div>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INPUT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helpText, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && <label htmlFor={props.id}>{label}</label>}
        <input
          ref={ref}
          className={`${error ? 'border-error ring-2 ring-error/20' : ''} ${className || ''}`}
          {...props}
        />
        {error && <p className="text-sm text-error">{error}</p>}
        {helpText && <p className="text-sm text-gray-600">{helpText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BADGES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  icon,
  className,
  children,
  ...props
}) => {
  const variantClass = {
    default: 'badge-default',
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
  }[variant];

  return (
    <span className={`badge ${variantClass} ${className || ''}`} {...props}>
      {icon}
      {children}
    </span>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATUS DOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: 'success' | 'warning' | 'error' | 'pending';
  label?: string;
}

export const StatusDot: React.FC<StatusDotProps> = ({ status, label, className, ...props }) => (
  <span className="inline-flex items-center gap-2" {...props}>
    <span className={`status-dot ${status}`} />
    {label && <span className="text-sm text-gray-600">{label}</span>}
  </span>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ALERT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({
  variant,
  title,
  icon,
  className,
  children,
  ...props
}) => {
  const variantClass = {
    success: 'alert-success',
    warning: 'alert-warning',
    error: 'alert-error',
    info: 'alert-info',
  }[variant];

  return (
    <div className={`alert ${variantClass} ${className || ''}`} {...props}>
      {icon && <div className="alert-icon">{icon}</div>}
      <div className="alert-content">
        {title && <div className="alert-title">{title}</div>}
        <div className="alert-description">{children}</div>
      </div>
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STAT CARD (Data display)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface StatCardProps {
  label: string;
  value: string | number;
  change?: { value: number; direction: 'up' | 'down' };
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, change, icon }) => (
  <Card>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-600 font-medium">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        {change && (
          <div className="mt-2 flex items-center gap-1">
            <span
              className={`text-sm font-semibold ${
                change.direction === 'up' ? 'text-success' : 'text-error'
              }`}
            >
              {change.direction === 'up' ? '↑' : '↓'} {change.value}%
            </span>
          </div>
        )}
      </div>
      {icon && <div className="text-gray-300">{icon}</div>}
    </div>
  </Card>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DIVIDER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const Divider: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`divider ${className || ''}`} />
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTAINER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={`container-app h-full ${className || ''}`} {...props}>
      {children}
    </div>
  )
);
Container.displayName = 'Container';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({
  title,
  description,
  className,
  children,
  ...props
}) => (
  <section className={`space-y-6 mb-12 h-full flex flex-col ${className || ''}`} {...props}>
    {title && (
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {description && <p className="text-gray-600 mt-2">{description}</p>}
      </div>
    )}
    {children}
  </section>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GRID
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: number;
  children: React.ReactNode;
}

export const Grid: React.FC<GridProps> = ({ cols = 3, className, children, ...props }) => {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[cols] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`grid ${colClasses} gap-6 ${className || ''}`} {...props}>
      {children}
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEXT UTILITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const Text: React.FC<{ variant?: 'body' | 'caption' | 'muted'; children: React.ReactNode; className?: string }> = ({
  variant = 'body',
  children,
  className,
}) => {
  const variantClass = {
    body: 'text-gray-700',
    caption: 'text-sm text-gray-600',
    muted: 'text-gray-500',
  }[variant];

  return <p className={`${variantClass} ${className || ''}`}>{children}</p>;
};
