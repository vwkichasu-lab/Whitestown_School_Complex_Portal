import showToast from "/static/scripts/JS/admin_d.js"

document.addEventListener('DOMContentLoaded', function() {
    initializeAnalysisCharts();
    initializeAnalysisFilters();
    initializeAnalysisEventListeners();
});

function initializeAnalysisCharts() {
    // Wait a bit to ensure DOM is fully ready
    setTimeout(() => {
        createGradeDistributionChart();
        createSubjectPerformanceChart();
        createClassPerformanceChart();
        createPerformanceTrendsChart();
    }, 100);
}

function initializeAnalysisFilters() {
    // Real-time filter updates
    const filterForm = document.querySelector('.filters-form');
    if (filterForm) {
        const inputs = filterForm.querySelectorAll('select');
        inputs.forEach(input => {
            input.addEventListener('change', function() {
                // Add a small delay to prevent too many requests
                clearTimeout(window.analysisFilterTimeout);
                window.analysisFilterTimeout = setTimeout(() => {
                    filterForm.submit();
                }, 800);
            });
        });
    }
}

function createGradeDistributionChart() {
    const ctx = document.getElementById('gradeDistributionChart');
    if (!ctx) return;

    const gradeData = getGradeDistributionData();
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: gradeData.labels,
            datasets: [{
                label: 'Number of Students',
                data: gradeData.data,
                backgroundColor: [
                    '#10b981', // A+ - Green
                    '#10b981', // A - Green
                    '#3b82f6', // B+ - Blue
                    '#3b82f6', // B - Blue
                    '#f59e0b', // C+ - Orange
                    '#f59e0b', // C - Orange
                    '#f59e0b', // D+ - Orange
                    '#ef4444', // D - Red
                    '#ef4444', // E - Red
                    '#ef4444'  // F - Red
                ],
                borderColor: [
                    '#0f9668', '#0f9668', '#2563eb', '#2563eb',
                    '#d97706', '#d97706', '#d97706', '#dc2626',
                    '#dc2626', '#dc2626'
                ],
                borderWidth: 1,
                borderRadius: 4,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Grade Distribution',
                    font: {
                        size: 16,
                        weight: '600'
                    },
                    padding: 20
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y} students`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Students',
                        font: {
                            weight: '600'
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Grades',
                        font: {
                            weight: '600'
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
}

function createSubjectPerformanceChart() {
    const ctx = document.getElementById('subjectPerformanceChart');
    if (!ctx) return;

    const subjectData = getSubjectPerformanceData();
    
    if (!subjectData.labels || subjectData.labels.length === 0) {
        ctx.parentElement.innerHTML = '<div class="empty-state"><p>No subject performance data available</p></div>';
        return;
    }
    
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: subjectData.labels,
            datasets: [{
                label: 'Average Score',
                data: subjectData.data,
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: '#3b82f6',
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#3b82f6',
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Subject Performance Comparison',
                    font: {
                        size: 16,
                        weight: '600'
                    },
                    padding: 20
                },
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.parsed.r}%`;
                        }
                    }
                }
            },
            scales: {
                r: {
                    angleLines: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    pointLabels: {
                        font: {
                            size: 11,
                            weight: '600'
                        },
                        color: '#374151'
                    },
                    min: 0,
                    max: 100,
                    ticks: {
                        stepSize: 20,
                        backdropColor: 'transparent',
                        color: '#64748b',
                        font: {
                            size: 10
                        }
                    }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeOutQuart'
            }
        }
    });
}

function createClassPerformanceChart() {
    const ctx = document.getElementById('classPerformanceChart');
    if (!ctx) return;

    const classData = getClassPerformanceData();
    
    if (!classData.labels || classData.labels.length === 0) {
        ctx.parentElement.innerHTML = '<div class="empty-state"><p>No class performance data available</p></div>';
        return;
    }
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: classData.labels,
            datasets: [
                {
                    label: 'Average Score',
                    data: classData.scores,
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    borderRadius: 4,
                    order: 2
                },
                {
                    label: 'Pass Rate',
                    data: classData.passRates,
                    type: 'line',
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    order: 1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Class Performance Comparison',
                    font: {
                        size: 16,
                        weight: '600'
                    },
                    padding: 20
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(1) + '%';
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Average Score (%)',
                        font: {
                            weight: '600'
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y1: {
                    beginAtZero: true,
                    max: 100,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Pass Rate (%)',
                        font: {
                            weight: '600'
                        }
                    },
                    grid: {
                        drawOnChartArea: false,
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            animation: {
                duration: 1200,
                easing: 'easeOutQuart'
            }
        }
    });
}

function createPerformanceTrendsChart() {
    const ctx = document.getElementById('performanceTrendsChart');
    if (!ctx) return;

    const trendData = getPerformanceTrendsData();
    
    if (!trendData.periods || trendData.periods.length === 0) {
        ctx.parentElement.innerHTML = '<div class="empty-state"><p>No performance trends data available</p></div>';
        return;
    }
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: trendData.periods,
            datasets: trendData.datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Performance Trends Over Time',
                    font: {
                        size: 16,
                        weight: '600'
                    },
                    padding: 20
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Average Score (%)',
                        font: {
                            weight: '600'
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Academic Period',
                        font: {
                            weight: '600'
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            animation: {
                duration: 1500,
                easing: 'easeOutQuart'
            }
        }
    });
}

// Data functions using real data from Django context
function getGradeDistributionData() {
    if (!window.analysisData || !window.analysisData.gradeDistribution) {
        return { labels: [], data: [] };
    }

    const gradeOrder = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'E', 'F'];
    const labels = [];
    const data = [];

    // Create a map of grade counts for easy lookup
    const gradeMap = {};
    window.analysisData.gradeDistribution.forEach(item => {
        gradeMap[item.grade] = item.count;
    });

    // Populate data in the correct order
    gradeOrder.forEach(grade => {
        labels.push(grade);
        data.push(gradeMap[grade] || 0);
    });

    return { labels, data };
}

function getSubjectPerformanceData() {
    if (!window.analysisData || !window.analysisData.subjectPerformance) {
        return { labels: [], data: [] };
    }

    const labels = [];
    const data = [];

    window.analysisData.subjectPerformance.forEach(subject => {
        labels.push(subject.subject__name);
        data.push(parseFloat(subject.avg_score) || 0);
    });

    return { labels, data };
}

function getClassPerformanceData() {
    if (!window.analysisData || !window.analysisData.classPerformance) {
        return { labels: [], scores: [], passRates: [] };
    }

    const labels = [];
    const scores = [];
    const passRates = [];

    window.analysisData.classPerformance.forEach(classItem => {
        labels.push(classItem.class_level__name);
        scores.push(parseFloat(classItem.avg_score) || 0);
        passRates.push(parseFloat(classItem.pass_rate) || 0);
    });

    return { labels, scores, passRates };
}

function getPerformanceTrendsData() {
    if (!window.analysisData || !window.analysisData.performanceTrends) {
        return { periods: [], datasets: [] };
    }

    // Group by term and calculate averages for each subject
    const trends = {};
    const subjects = new Set();
    const periods = new Set();

    window.analysisData.performanceTrends.forEach(item => {
        const periodKey = `${item.term__name} ${item.term__academic_year__name}`;
        periods.add(periodKey);
        subjects.add(item.subject__name);

        if (!trends[periodKey]) {
            trends[periodKey] = {};
        }
        trends[periodKey][item.subject__name] = parseFloat(item.avg_score) || 0;
    });

    // Convert to arrays
    const periodArray = Array.from(periods);
    const subjectArray = Array.from(subjects);

    // Create datasets for each subject
    const datasets = subjectArray.map(subject => {
        const data = periodArray.map(period => trends[period][subject] || 0);
        
        // Assign colors based on subject
        const colors = {
            'Mathematics': { border: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)' },
            'English': { border: '#10b981', background: 'rgba(16, 185, 129, 0.1)' },
            'Science': { border: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' },
            'Social Studies': { border: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)' },
            'ICT': { border: '#ec4899', background: 'rgba(236, 72, 153, 0.1)' }
        };

        const color = colors[subject] || { border: '#64748b', background: 'rgba(100, 116, 139, 0.1)' };

        return {
            label: subject,
            data: data,
            borderColor: color.border,
            backgroundColor: color.background,
            tension: 0.4,
            borderWidth: 3,
            pointBackgroundColor: color.border,
            pointBorderColor: '#fff',
            pointRadius: 4,
            pointHoverRadius: 6
        };
    });

    return {
        periods: periodArray,
        datasets: datasets
    };
}

// Rest of your existing functions remain the same...
function initializeAnalysisEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refreshDataBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshAnalysisData);
    }
    
    // Export options
    const exportOptions = document.querySelectorAll('.export-option');
    exportOptions.forEach(option => {
        option.addEventListener('click', function() {
            const format = this.getAttribute('data-format');
            exportAnalysis(format);
        });
    });
}

async function refreshAnalysisData() {
    const refreshBtn = document.getElementById('refreshDataBtn');
    if (!refreshBtn) return;
    
    const originalHtml = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '<span class="loading-spinner"></span> Refreshing...';
    refreshBtn.disabled = true;
    
    try {
        const filters = getCurrentFilters();
        let refreshUrl = window.location.pathname;
        
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key]) {
                params.append(key, filters[key]);
            }
        });
        
        if (params.toString()) {
            refreshUrl += '?' + params.toString();
        }
        
        window.location.href = refreshUrl;
        
    } catch (error) {
        console.error('Error refreshing data:', error);
        showToast('Error refreshing data', 'error');
        refreshBtn.innerHTML = originalHtml;
        refreshBtn.disabled = false;
    }
}

async function exportAnalysis(format = 'pdf') {
    const filters = getCurrentFilters();
    let exportUrl = `/academics/results/analysis/export/?format=${format}`;
    
    Object.keys(filters).forEach(key => {
        if (filters[key]) {
            exportUrl += `&${key}=${filters[key]}`;
        }
    });
    
    // Show loading state on all export buttons
    const exportOptions = document.querySelectorAll('.export-option');
    const exportDropdownBtn = document.getElementById('exportDropdownBtn');
    const originalTexts = [];
    
    exportOptions.forEach(btn => {
        originalTexts.push(btn.innerHTML);
        btn.innerHTML = '<span class="loading-spinner"></span> Exporting...';
        btn.disabled = true;
    });
    
    if (exportDropdownBtn) {
        const originalDropdownText = exportDropdownBtn.innerHTML;
        exportDropdownBtn.innerHTML = '<span class="loading-spinner"></span> Exporting...';
        exportDropdownBtn.disabled = true;
    }
    
    try {
        const response = await fetch(exportUrl);
        
        if (!response.ok) {
            throw new Error(`Export failed: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `results_analysis_${timestamp}.${format}`;
        a.download = filename;
        
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast(`${format.toUpperCase()} report exported successfully`, 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showToast(`Export failed: ${error.message}`, 'error');
    } finally {
        // Restore buttons
        exportOptions.forEach((btn, index) => {
            btn.innerHTML = originalTexts[index];
            btn.disabled = false;
        });
        
        if (exportDropdownBtn) {
            exportDropdownBtn.innerHTML = '<i class="bi bi-download"></i> Export Report';
            exportDropdownBtn.disabled = false;
        }
    }
}

// Print functionality - uses browser's native print
function printAnalysisReport() {
    const originalTitle = document.title;
    document.title = 'Academic Results Analysis Report - ' + new Date().toLocaleDateString();
    
    const printStyle = document.createElement('style');
    printStyle.innerHTML = `
        @media print {
            /* Hide unnecessary elements */
            .top-bar, 
            .header-actions, 
            .filters-card, 
            .btn, 
            .dropdown,
            .search-box,
            .user-profile,
            .logout-btn,
            .action-buttons {
                display: none !important;
            }
            
            /* Ensure content is visible and properly formatted */
            .main-content {
                margin: 0 !important;
                padding: 20px !important;
                width: 100% !important;
            }
            
            /* Improve chart visibility for print */
            .chart-container {
                height: 250px !important;
                page-break-inside: avoid;
            }
            
            /* Better table formatting for print */
            .table-responsive {
                overflow: visible !important;
            }
            
            /* Stats grid adjustment */
            .stats-grid {
                grid-template-columns: repeat(4, 1fr) !important;
                gap: 15px !important;
                margin-bottom: 20px !important;
            }
            
            /* Card styling for print */
            .card {
                box-shadow: none !important;
                border: 1px solid #ddd !important;
                margin-bottom: 20px !important;
                page-break-inside: avoid;
            }
            
            /* Analysis grid adjustment */
            .analysis-grid {
                grid-template-columns: 1fr 1fr !important;
                gap: 15px !important;
            }
            
            /* Ensure good contrast for print */
            body {
                color: #000 !important;
                background: #fff !important;
            }
            
            /* Page breaks */
            .analysis-card, .card {
                page-break-inside: avoid;
            }
            
            /* Header for printed pages */
            @page {
                margin: 1cm;
                @top-center {
                    content: "Academic Results Analysis Report - Whitestown School Complex";
                    font-size: 12px;
                    color: #666;
                }
                @bottom-center {
                    content: "Page " counter(page) " of " counter(pages);
                    font-size: 10px;
                    color: #666;
                }
            }
        }
        
        @media print and (color) {
            * {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    `;
    
    document.head.appendChild(printStyle);
    
    window.print();
    
    setTimeout(() => {
        document.title = originalTitle;
        if (document.head.contains(printStyle)) {
            document.head.removeChild(printStyle);
        }
    }, 500);
}

function getCurrentFilters() {
    const urlParams = new URLSearchParams(window.location.search);
    const filters = {};
    
    for (const [key, value] of urlParams) {
        filters[key] = value;
    }
    
    return filters;
}

window.ResultsAnalysis = {
    refreshData: refreshAnalysisData,
    exportReport: exportAnalysis,
    printReport: printAnalysisReport,
    initializeCharts: initializeAnalysisCharts
};
