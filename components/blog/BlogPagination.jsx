'use client';

const BlogPagination = ({ totalPosts, postsPerPage, currentPage, paginate }) => {
    const pageNumbers = [];

    for (let i = 1; i <= Math.ceil(totalPosts / postsPerPage); i++) {
        pageNumbers.push(i);
    }

    if (pageNumbers.length <= 1) return null;

    return (
        <nav className="blog-pagination">
            <ul className="pagination-list">
                {pageNumbers.map(number => (
                    <li key={number} className="page-item">
                        <button
                            onClick={() => paginate(number)}
                            className={`page-link ${currentPage === number ? 'active' : ''}`}
                        >
                            {number}
                        </button>
                    </li>
                ))}
            </ul>

            <style jsx>{`
                .blog-pagination {
                    display: flex;
                    justify-content: center;
                    margin-top: 2rem;
                    padding-bottom: 2rem;
                }
                .pagination-list {
                    display: flex;
                    gap: 10px;
                    list-style: none;
                    padding: 0;
                }
                .page-link {
                    border: 1px solid var(--border-color);
                    background: var(--color-bg-light);
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-weight: 600;
                    color: var(--color-text-secondary);
                }
                .page-link:hover {
                    border-color: var(--color-primary);
                    color: var(--color-primary);
                }
                .page-link.active {
                    background: var(--color-primary);
                    color: white;
                    border-color: var(--color-primary);
                }
            `}</style>
        </nav>
    );
};

export default BlogPagination;
