package com.fleet.backend.dto;

import java.time.LocalDate;

public record TruckDocumentRequest(
        String type,
        String documentNumber,
        LocalDate issuedOn,
        LocalDate expiresOn,
        String note
) {}
