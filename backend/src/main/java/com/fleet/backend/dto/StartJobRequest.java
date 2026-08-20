package com.fleet.backend.dto;

/**
 * Body of {@code POST /api/driver/jobs/{id}/start}.
 *
 * <p>{@code truckToken} is the value behind the QR sticker in the truck's cab.
 * The driver's login already establishes <em>who</em> they are; this proves they
 * are physically <em>at the vehicle</em>. Only starting a job requires it —
 * pause, resume and finish are plain taps.</p>
 */
public record StartJobRequest(String truckToken) {}
