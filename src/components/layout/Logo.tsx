interface LogoProps {
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-3xl",
} as const;

export function Logo({ size = "md" }: LogoProps) {
  return (
    <span className={`font-semibold tracking-tight ${sizes[size]}`}>
      <span className="text-primary">avanti</span>
      <span className="text-muted-foreground">.</span>
      <span className="text-secondary">rh</span>
    </span>
  );
}