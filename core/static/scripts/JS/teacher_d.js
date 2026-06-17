
export default function showToast(message, type = "success", duration = 3000) {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.style.position = "fixed";
        container.style.top = "20px";
        container.style.right = "20px";
        container.style.zIndex = 9999;
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "10px";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.background = type === "success" ? "#22c55e" : type === "error" ? "#ef4444" : "#3b82f6";
    toast.style.color = "#fff";
    toast.style.padding = "12px 20px";
    toast.style.borderRadius = "8px";
    toast.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.4s ease";

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateX(0)";
    });

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(100%)";
        toast.addEventListener("transitionend", () => {
            toast.remove();
        });
    }, duration);
}


export function showLoader() {
    const loader = document.createElement('div');
    loader.className = 'modal show';
    loader.innerHTML = `
        <div class="modal-content" style="text-align: center; max-width: 200px;">
            <div class="loader-spinner"></div>
            <p>Loading...</p>
        </div>
    `;
    loader.id = 'loader-modal';
    document.body.appendChild(loader);
}

export function hideLoader() {
    const loader = document.getElementById('loader-modal');
    if (loader) loader.remove();
}


document.addEventListener("DOMContentLoaded", function() {
    const navLinks = document.querySelectorAll(".nav-links li a");
    const currentPath = window.location.pathname.replace(/\/$/, "");

    navLinks.forEach(link => {
        if (!link.href || link.getAttribute("href") === "#") return;

        const linkPath = new URL(link.href, window.location.origin)
            .pathname.replace(/\/$/, "");

        if (linkPath === currentPath) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }

        link.addEventListener("click", () => {
            navLinks.forEach(l => l.classList.remove("active"));
            link.classList.add("active");
        });
    });
});