package com.sekai.game.controller;

import com.sekai.game.entity.Deck;
import com.sekai.game.service.DeckService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/decks")
public class DeckController {

    @Autowired
    private DeckService deckService;

    @GetMapping("/user/{userId}")
    @PreAuthorize("@userAccess.isCurrentUser(#userId)")
    public ResponseEntity<List<Deck>> getUserDecks(@PathVariable Long userId) {
        return ResponseEntity.ok(deckService.getUserDecks(userId));
    }

    @GetMapping("/{deckId}")
    @PreAuthorize("@userAccess.isDeckOwner(#deckId)")
    public ResponseEntity<?> getDeck(@PathVariable String deckId) {
        return deckService.getDeckById(deckId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/user/{userId}")
    @PreAuthorize("@userAccess.isCurrentUser(#userId)")
    public ResponseEntity<?> createDeck(@PathVariable Long userId, @RequestBody Map<String, Object> body) {
        try {
            if (body == null) throw new IllegalArgumentException("请求数据不能为空");
            String name = text(body.get("name"));
            String coverCardId = text(body.get("coverCardId"));
            List<String> mainCardIds = cardIds(body.get("main"), "主卡组");
            Deck deck = deckService.createDeck(userId, name, coverCardId, mainCardIds);
            return ResponseEntity.ok(deck);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("reason", e.getMessage()));
        }
    }

    @PutMapping("/{deckId}")
    @PreAuthorize("@userAccess.isDeckOwner(#deckId)")
    public ResponseEntity<?> updateDeck(@PathVariable String deckId, @RequestBody Map<String, Object> body) {
        try {
            if (body == null) throw new IllegalArgumentException("请求数据不能为空");
            String name = text(body.get("name"));
            String coverCardId = text(body.get("coverCardId"));
            List<String> mainCardIds = cardIds(body.get("main"), "主卡组");
            List<String> extraCardIds = cardIds(body.get("extra"), "额外卡组");
            List<String> sideCardIds = cardIds(body.get("side"), "副卡组");
            Deck deck = deckService.updateDeck(deckId, name, coverCardId, mainCardIds, extraCardIds, sideCardIds);
            return ResponseEntity.ok(deck);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("reason", e.getMessage()));
        }
    }

    @DeleteMapping("/{deckId}")
    @PreAuthorize("@userAccess.isDeckOwner(#deckId)")
    public ResponseEntity<?> deleteDeck(@PathVariable String deckId) {
        try {
            deckService.deleteDeck(deckId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("reason", e.getMessage()));
        }
    }

    private String text(Object value) {
        return value instanceof String text && !text.isBlank() ? text.trim() : null;
    }

    private List<String> cardIds(Object value, String label) {
        if (value == null) return List.of();
        if (!(value instanceof List<?> list)) throw new IllegalArgumentException(label + "格式错误");
        return list.stream().map(item -> {
            if (!(item instanceof String cardId) || cardId.isBlank()) {
                throw new IllegalArgumentException(label + "包含无效卡牌ID");
            }
            return cardId.trim();
        }).toList();
    }
}
