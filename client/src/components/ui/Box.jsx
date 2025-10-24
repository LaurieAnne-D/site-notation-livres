export default function Box({ children, className = "", ...rest }) {
    return (
        <div className={`box ${className}`} {...rest}>
            {children}
        </div>
    );
}

