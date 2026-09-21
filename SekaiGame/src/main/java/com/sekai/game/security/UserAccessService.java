package com.sekai.game.security;

import com.sekai.game.repository.DeckRepository;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component("userAccess")
public class UserAccessService {

    private final DeckRepository deckRepository;

    public UserAccessService(DeckRepository deckRepository) {
        this.deckRepository = deckRepository;
    }

    public boolean isCurrentUser(Long userId) {
        if (userId == null) return false;
        Authentication authentication = currentAuthentication();
        return authentication != null && userId.toString().equals(authentication.getName());
    }

    public boolean isDeckOwner(String deckId) {
        if (deckId == null || deckId.isBlank()) return false;
        return deckRepository.findById(deckId)
            .map(deck -> deck.getUser() != null && isCurrentUser(deck.getUser().getId()))
            .orElse(false);
    }

    public boolean isAdmin() {
        Authentication authentication = currentAuthentication();
        return authentication != null && authentication.getAuthorities().stream()
            .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }

    private Authentication currentAuthentication() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
            || authentication instanceof AnonymousAuthenticationToken) {
            return null;
        }
        return authentication;
    }
}
