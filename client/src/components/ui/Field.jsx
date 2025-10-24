export default function Field({ label, children, className = "" }) {
    return (
        <label className={`field ${className}`}>
            <div className="field__label">{label}</div>
            {children}
        </label>
    );
}