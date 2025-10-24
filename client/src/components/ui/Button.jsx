export default function Button({ children, variant, className = "", ...props }) {
    const v = variant === "primary" ? "btn--primary" : "";
    return (
        <button className={`btn ${v} ${className}`} {...props}>
            {children}
        </button>
    );
}
