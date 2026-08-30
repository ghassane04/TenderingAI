-- =============================================
-- FONCTIONS UTILITAIRES
-- =============================================

-- Remplace le ON UPDATE CURRENT_TIMESTAMP de MySQL, absent en Postgres.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TYPES ÉNUMÉRÉS
-- =============================================

CREATE TYPE email_direction AS ENUM ('outbound', 'inbound');

-- =============================================
-- TABLES DE RÉFÉRENCE
-- =============================================

CREATE TABLE agents (
    id SERIAL PRIMARY KEY,
    last_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    email VARCHAR(180) NOT NULL,
    username VARCHAR(180) NOT NULL,
    password VARCHAR(255) NOT NULL,
    roles JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT agents_email_unique UNIQUE (email),
    CONSTRAINT agents_username_unique UNIQUE (username)
);

CREATE TRIGGER trg_agents_updated_at
BEFORE UPDATE ON agents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


CREATE TABLE documents_type (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    label VARCHAR(255) DEFAULT NULL
);

INSERT INTO documents_type (id, name, label) VALUES
    (1, 'pdf', 'PDF Document'),
    (2, 'docx', 'Word Document'),
    (3, 'xlsx', 'Excel Document'),
    (4, 'txt', 'Text Document')
ON CONFLICT (id) DO NOTHING;

-- Aligne la séquence sur le max(id) après un insert avec id explicite
SELECT setval('documents_type_id_seq', (SELECT MAX(id) FROM documents_type));


CREATE TABLE document_status (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

INSERT INTO document_status (id, name) VALUES
    (1, 'En attente'),
    (2, 'En cours'),
    (3, 'Traité'),
    (4, 'Erreur')
ON CONFLICT (id) DO NOTHING;

SELECT setval('document_status_id_seq', (SELECT MAX(id) FROM document_status));


CREATE TABLE tendering_status (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

INSERT INTO tendering_status (id, name) VALUES
    (1, 'Metadonnées extraites'),
    (2, 'Extraction des exigences en cours'),
    (3, 'Extraction des exigences terminée'),
    (4, 'Erreur')
ON CONFLICT (id) DO NOTHING;

SELECT setval('tendering_status_id_seq', (SELECT MAX(id) FROM tendering_status));


CREATE TABLE supplier_datasheet_status (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

INSERT INTO supplier_datasheet_status (id, name) VALUES
    (1, 'En attente'),
    (2, 'En cours'),
    (3, 'Traité'),
    (4, 'Erreur')
ON CONFLICT (id) DO NOTHING;

SELECT setval('supplier_datasheet_status_id_seq', (SELECT MAX(id) FROM supplier_datasheet_status));


CREATE TABLE score_conformite (
    id INT PRIMARY KEY,
    designation VARCHAR(50) NOT NULL,
    description VARCHAR(255) DEFAULT NULL
);

INSERT INTO score_conformite (id, designation, description) VALUES
    (1, 'Conforme', 'La valeur fournie respecte totalement l''exigence'),
    (2, 'Non conforme', 'La valeur fournie ne respecte pas l''exigence'),
    (3, 'Non spécifié', 'Aucune caractéristique correspondante trouvée pour cette exigence')
ON CONFLICT (id) DO NOTHING;


CREATE TABLE tender_supplier_lots_status (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

INSERT INTO tender_supplier_lots_status (id, name) VALUES
    (1, 'Non envoyé'),
    (2, 'Email envoyé'),
    (3, 'Réponse reçue'),
    (4, 'Erreur envoi'),
    (5, 'Erreur réception')
ON CONFLICT (id) DO NOTHING;

SELECT setval('tender_supplier_lots_status_id_seq', (SELECT MAX(id) FROM tender_supplier_lots_status));

-- =============================================
-- FOURNISSEURS
-- =============================================

CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) DEFAULT NULL,
    description VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_suppliers_updated_at
BEFORE UPDATE ON suppliers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE technical_lot (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description VARCHAR(500) DEFAULT NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_technical_lot_updated_at
BEFORE UPDATE ON technical_lot
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- APPELS D'OFFRES (TENDERS)
-- =============================================

CREATE TABLE tenders (
    id SERIAL PRIMARY KEY,
    code VARCHAR(255) DEFAULT NULL,
    designation VARCHAR(255) DEFAULT NULL,
    nom_client VARCHAR(255) DEFAULT NULL,
    uploaded_at TIMESTAMP DEFAULT NULL,
    uploaded_by VARCHAR(500) DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT NULL,
    updated_by VARCHAR(500) DEFAULT NULL,
    status_id INT DEFAULT NULL,
    CONSTRAINT fk_tenders_status
        FOREIGN KEY (status_id)
        REFERENCES tendering_status (id)
        ON DELETE SET NULL
);

CREATE INDEX idx_tenders_status ON tenders (status_id);


CREATE TABLE tenders_documents (
    id SERIAL PRIMARY KEY,
    designation VARCHAR(255) DEFAULT NULL,
    count_chunks INT NOT NULL DEFAULT 0,
    nb_chunks_done INT NOT NULL DEFAULT 0,
    path VARCHAR(1024) DEFAULT NULL,
    uploaded_at TIMESTAMP DEFAULT NULL,
    uploaded_by VARCHAR(500) DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT NULL,
    updated_by VARCHAR(500) DEFAULT NULL,
    tender_id INT NOT NULL,
    filetype_id INT DEFAULT NULL,
    statut_id INT DEFAULT NULL,
    file_size VARCHAR(20) DEFAULT NULL,
    CONSTRAINT fk_tenders_documents_tender
        FOREIGN KEY (tender_id)
        REFERENCES tenders (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_tenders_documents_filetype
        FOREIGN KEY (filetype_id)
        REFERENCES documents_type (id)
        ON DELETE SET NULL,
    CONSTRAINT fk_tenders_documents_statut
        FOREIGN KEY (statut_id)
        REFERENCES document_status (id)
        ON DELETE SET NULL
);

CREATE INDEX idx_tenders_documents_tender ON tenders_documents (tender_id);
CREATE INDEX idx_tenders_documents_filetype ON tenders_documents (filetype_id);
CREATE INDEX idx_tenders_documents_statut ON tenders_documents (statut_id);

CREATE TABLE tenders_products (
    id SERIAL PRIMARY KEY,
    designation VARCHAR(255) DEFAULT NULL,
    tender_id INT DEFAULT NULL,
    tender_document_id INT DEFAULT NULL,
    technical_lot_id INT DEFAULT NULL,
    CONSTRAINT fk_tenders_products_tender
        FOREIGN KEY (tender_id)
        REFERENCES tenders (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_tenders_products_document
        FOREIGN KEY (tender_document_id)
        REFERENCES tenders_documents (id)
        ON DELETE SET NULL,
    CONSTRAINT fk_tenders_products_technical_lot
        FOREIGN KEY (technical_lot_id)
        REFERENCES technical_lot (id)
        ON DELETE SET NULL
);

CREATE INDEX idx_tenders_products_tender ON tenders_products (tender_id);
CREATE INDEX idx_tenders_products_document ON tenders_products (tender_document_id);
CREATE INDEX idx_tenders_products_technical_lot ON tenders_products (technical_lot_id);

CREATE TABLE tenders_products_requirements (
    id SERIAL PRIMARY KEY,
    requirement VARCHAR(500) DEFAULT NULL,
    operateur VARCHAR(50) DEFAULT NULL,
    value TEXT DEFAULT NULL,
    product_id INT DEFAULT NULL,
    CONSTRAINT fk_requirements_product
        FOREIGN KEY (product_id)
        REFERENCES tenders_products (id)
        ON DELETE CASCADE
);

CREATE INDEX idx_requirements_product ON tenders_products_requirements (product_id);


-- =============================================
-- FICHES TECHNIQUES FOURNISSEURS
-- =============================================

CREATE TABLE supplier_datasheets (
    id SERIAL PRIMARY KEY,
    designation VARCHAR(255) DEFAULT NULL,
    file_path VARCHAR(1024) DEFAULT NULL,
    file_size VARCHAR(20) DEFAULT NULL,
    supplier_id INT NOT NULL,
    technical_lot_id INT DEFAULT NULL,
    tender_id INT DEFAULT NULL,
    filetype_id INT DEFAULT NULL,
    supplier_datasheet_status_id INT DEFAULT NULL,
    uploaded_at TIMESTAMP DEFAULT NULL,
    uploaded_by VARCHAR(500) DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT NULL,
    updated_by VARCHAR(500) DEFAULT NULL,
    CONSTRAINT fk_datasheets_supplier
        FOREIGN KEY (supplier_id)
        REFERENCES suppliers (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_datasheets_technical_lot
        FOREIGN KEY (technical_lot_id) 
        REFERENCES technical_lot (id) 
        ON DELETE SET NULL,
    CONSTRAINT fk_datasheets_tender
        FOREIGN KEY (tender_id)
        REFERENCES tenders (id)
        ON DELETE SET NULL,
    CONSTRAINT fk_datasheets_status
        FOREIGN KEY (supplier_datasheet_status_id)
        REFERENCES supplier_datasheet_status (id)
        ON DELETE SET NULL,
    CONSTRAINT fk_supplier_datasheet_filetype
        FOREIGN KEY (filetype_id)
        REFERENCES documents_type (id)
        ON DELETE SET NULL
);

CREATE INDEX idx_datasheets_supplier ON supplier_datasheets (supplier_id);
CREATE INDEX idx_datasheets_tender ON supplier_datasheets (tender_id);
CREATE INDEX idx_datasheets_status ON supplier_datasheets (supplier_datasheet_status_id);
CREATE INDEX idx_supplier_datasheet_filetype ON supplier_datasheets (filetype_id);


CREATE TABLE suppliers_products (
    id SERIAL PRIMARY KEY,
    designation VARCHAR(255) NOT NULL,
    product_id INT DEFAULT NULL,
    supplier_datasheet_id INT DEFAULT NULL,
    CONSTRAINT fk_supplier_products_product
        FOREIGN KEY (product_id)
        REFERENCES tenders_products (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_supplier_products_datasheet
        FOREIGN KEY (supplier_datasheet_id)
        REFERENCES supplier_datasheets (id)
        ON DELETE CASCADE
);

CREATE INDEX idx_supplier_products_product ON suppliers_products (product_id);
CREATE INDEX idx_supplier_products_datasheet ON suppliers_products (supplier_datasheet_id);


CREATE TABLE suppliers_products_technical_caracteristic (
    id SERIAL PRIMARY KEY,
    technical_data VARCHAR(500) NOT NULL,
    value TEXT DEFAULT NULL,
    evaluation INT DEFAULT NULL,
    supplier_product_id INT NOT NULL,
    requirement_id INT DEFAULT NULL,
    CONSTRAINT fk_technical_supplier_product
        FOREIGN KEY (supplier_product_id)
        REFERENCES suppliers_products (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_technical_requirement
        FOREIGN KEY (requirement_id)
        REFERENCES tenders_products_requirements (id)
        ON DELETE SET NULL,
    CONSTRAINT fk_technical_evaluation
        FOREIGN KEY (evaluation)
        REFERENCES score_conformite (id)
        ON DELETE SET NULL
);

CREATE INDEX idx_technical_supplier_product ON suppliers_products_technical_caracteristic (supplier_product_id);
CREATE INDEX idx_technical_requirement ON suppliers_products_technical_caracteristic (requirement_id);
CREATE INDEX idx_technical_evaluation ON suppliers_products_technical_caracteristic (evaluation);

-- =============================================
-- RÉSULTATS DE COMPARAISON (scorecard)
-- =============================================

CREATE TABLE supplier_product_comparison_results (
    id SERIAL PRIMARY KEY,
    supplier_product_id INT NOT NULL,
    product_id INT NOT NULL,
    score DECIMAL(5,2) DEFAULT NULL,
    computed_at TIMESTAMP DEFAULT NULL,
    computed_by VARCHAR(255) DEFAULT NULL,
    CONSTRAINT ux_comparison_supplier_product UNIQUE (supplier_product_id),
    CONSTRAINT fk_comparison_supplier_product
        FOREIGN KEY (supplier_product_id)
        REFERENCES suppliers_products (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_comparison_product
        FOREIGN KEY (product_id)
        REFERENCES tenders_products (id)
        ON DELETE CASCADE
);

CREATE INDEX idx_comparison_product ON supplier_product_comparison_results (product_id);


CREATE TABLE tender_supplier_lots (
    id SERIAL PRIMARY KEY,
    tender_id INT NOT NULL,
    supplier_id INT NOT NULL,
    technical_lot_id INT NOT NULL,
    status_id INT DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tender_id) REFERENCES tenders (id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE CASCADE,
    FOREIGN KEY (technical_lot_id) REFERENCES technical_lot (id) ON DELETE CASCADE,
    FOREIGN KEY (status_id) REFERENCES tender_supplier_lots_status (id) ON DELETE CASCADE,
    CONSTRAINT unique_tender_supplier_lot UNIQUE (tender_id, supplier_id, technical_lot_id)
);


CREATE TABLE tender_supplier_lot_emails (
    id SERIAL PRIMARY KEY,
    tsl_id INT DEFAULT NULL,
    tender_id INT NOT NULL,
    supplier_id INT NOT NULL,
    technical_lot_id INT NOT NULL,
    direction email_direction NOT NULL,
    subject VARCHAR(500) DEFAULT NULL,
    body_envoi TEXT DEFAULT NULL,
    body_recu TEXT DEFAULT NULL,
    tracking_token VARCHAR(16) DEFAULT NULL,
    message_id VARCHAR(500) DEFAULT NULL,
    in_reply_to VARCHAR(500) DEFAULT NULL,
    from_address VARCHAR(255) DEFAULT NULL,
    to_address VARCHAR(255) DEFAULT NULL,
    sent_at TIMESTAMP DEFAULT NULL,
    received_at TIMESTAMP DEFAULT NULL,
    status_id INT DEFAULT NULL,
    error_message VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ux_tracking_token UNIQUE (tracking_token),
    FOREIGN KEY (tsl_id) REFERENCES tender_supplier_lots (id) ON DELETE SET NULL,
    FOREIGN KEY (tender_id) REFERENCES tenders (id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE CASCADE,
    FOREIGN KEY (technical_lot_id) REFERENCES technical_lot (id) ON DELETE CASCADE,
    FOREIGN KEY (status_id) REFERENCES tender_supplier_lots_status (id) ON DELETE SET NULL
);

CREATE INDEX ix_message_id ON tender_supplier_lot_emails (message_id);
CREATE INDEX ix_tender_supplier_lot ON tender_supplier_lot_emails (tender_id, supplier_id, technical_lot_id);


CREATE TABLE jwt_blacklist (
    id SERIAL PRIMARY KEY,
    token_jti VARCHAR(255) NOT NULL,
    blacklisted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ux_jwt_blacklist_jti UNIQUE (token_jti)
);

CREATE INDEX idx_jwt_blacklist_jti ON jwt_blacklist (token_jti);
CREATE INDEX idx_jwt_blacklist_blacklisted_at ON jwt_blacklist (blacklisted_at);

CREATE TABLE tender_lots_pdfs (
    id SERIAL PRIMARY KEY,
    tender_id INT NOT NULL,
    technical_lot_id INT NOT NULL,
    lot_name VARCHAR(255) NOT NULL,
    filename VARCHAR(500) NOT NULL,
    file_path VARCHAR(1024) NOT NULL,
    file_size VARCHAR(20) DEFAULT NULL,
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    generated_by VARCHAR(255) DEFAULT 'SYSTEM',
    CONSTRAINT ux_tender_lot_pdf UNIQUE (tender_id, technical_lot_id),
    CONSTRAINT fk_tender_lots_pdfs_tender
        FOREIGN KEY (tender_id)
        REFERENCES tenders (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_tender_lots_pdfs_lot
        FOREIGN KEY (technical_lot_id)
        REFERENCES technical_lot (id)
        ON DELETE CASCADE
);

CREATE TABLE supplier_product_match_candidates (
    id SERIAL PRIMARY KEY,
    supplier_product_id INT NOT NULL,
    tender_product_id INT NOT NULL,
    score DECIMAL(5,4) NOT NULL,
    rank SMALLINT NOT NULL,
    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_match_candidates_supplier_product
        FOREIGN KEY (supplier_product_id) REFERENCES suppliers_products (id) ON DELETE CASCADE,
    CONSTRAINT fk_match_candidates_tender_product
        FOREIGN KEY (tender_product_id) REFERENCES tenders_products (id) ON DELETE CASCADE,
    CONSTRAINT ux_match_candidate UNIQUE (supplier_product_id, tender_product_id)
);

CREATE INDEX idx_match_candidates_supplier_product ON supplier_product_match_candidates (supplier_product_id, rank);